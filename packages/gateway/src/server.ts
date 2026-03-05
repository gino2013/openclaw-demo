import http from 'node:http'
import express from 'express'
import { WebSocketServer } from 'ws'
import type WebSocket from 'ws'
import { createLogger, WorkflowEventType, AuthError, InvalidMessageError } from '@openclaw/core'
import type { GatewayMessage, RegisterPayload } from '@openclaw/core'
import { AgentRegistry } from './agent-registry'
import { EventBus } from './event-bus'

const logger = createLogger('gateway')

const HEARTBEAT_INTERVAL_MS = 30_000
const HEARTBEAT_TIMEOUT_MS = 60_000

/**
 * Creates and starts the OpenClaw Gateway server.
 * Exposes a WebSocket endpoint for agents and HTTP endpoints for SSE + REST.
 */
export function createGatewayServer(): http.Server {
  const token = process.env['OPENCLAW_GATEWAY_TOKEN']
  const port = Number(process.env['OPENCLAW_GATEWAY_PORT'] ?? 18789)

  const registry = new AgentRegistry()
  const eventBus = new EventBus()
  // Maps taskId → orchestrator WebSocket, for result forwarding
  const orchestratorSockets = new Map<string, WebSocket>()
  const app = express()

  app.use(express.json())

  // CORS for frontend
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    next()
  })

  /**
   * GET /agents — Returns all registered agents (without socket refs).
   */
  app.get('/agents', (req, res) => {
    if (token && req.headers.authorization !== `Bearer ${token}`) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    res.json({ agents: registry.getAll() })
  })

  /**
   * GET /events — SSE stream of WorkflowEvents.
   */
  app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    eventBus.addClient(res)

    req.on('close', () => {
      eventBus.removeClient(res)
    })
  })

  const server = http.createServer(app)
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws: WebSocket) => {
    logger.debug('New WebSocket connection')
    let agentId: string | null = null

    ws.on('message', (raw) => {
      let msg: GatewayMessage
      try {
        msg = JSON.parse(raw.toString()) as GatewayMessage
      } catch {
        ws.send(JSON.stringify(new InvalidMessageError('Invalid JSON').context))
        return
      }

      try {
        handleMessage(ws, msg)
      } catch (err) {
        logger.error({ err }, 'Error handling message')
      }
    })

    ws.on('close', () => {
      if (agentId) {
        registry.unregister(agentId)
        eventBus.emit(WorkflowEventType.AGENT_DISCONNECTED, `Agent ${agentId} disconnected`, {
          agentId,
        })
      }
    })

    ws.on('error', (err) => {
      logger.error({ err }, 'WebSocket error')
    })

    function handleMessage(socket: WebSocket, msg: GatewayMessage): void {
      switch (msg.type) {
        case 'REGISTER': {
          const payload = msg.payload as RegisterPayload
          if (token && payload.token !== token) {
            throw new AuthError('Invalid gateway token', { agentId: payload.agentId })
          }
          agentId = payload.agentId
          registry.register({
            id: payload.agentId,
            name: payload.name,
            role: payload.role,
            capabilities: payload.capabilities,
            socket,
            connectedAt: new Date().toISOString(),
            lastHeartbeat: new Date().toISOString(),
            status: 'idle',
          })
          socket.send(
            JSON.stringify({
              type: 'REGISTER_ACK',
              correlationId: msg.correlationId,
              payload: { success: true, agentId: payload.agentId },
            })
          )
          eventBus.emit(WorkflowEventType.AGENT_CONNECTED, `Agent '${payload.name}' connected`, {
            agentId: payload.agentId,
            data: { name: payload.name, role: payload.role, capabilities: payload.capabilities },
          })
          break
        }

        case 'TASK_ASSIGN': {
          // Orchestrator → Gateway → Agent forwarding
          const payload = msg.payload as { task: { id: string; requiredRole: string; delegationChain: string[] } }
          const { task } = payload
          const candidates = registry.getByRole(task.requiredRole as Parameters<typeof registry.getByRole>[0])
          const idle = candidates.find((a) => a.status === 'idle') ?? candidates[0]
          if (!idle) {
            socket.send(JSON.stringify({
              type: 'TASK_ERROR',
              correlationId: msg.correlationId,
              payload: { taskId: task.id, error: `No agent available for role '${task.requiredRole}'`, retryable: true },
            }))
            break
          }
          registry.setStatus(idle.id, 'busy')
          idle.socket.send(JSON.stringify({ type: 'TASK_ASSIGN', correlationId: msg.correlationId, payload: { task } }))
          // Store reply-to socket so result can be forwarded back
          orchestratorSockets.set(task.id, socket)
          eventBus.emit(WorkflowEventType.TASK_DELEGATED, `Task '${task.id}' delegated to '${idle.name}'`, {
            agentId: idle.id, taskId: task.id,
          })
          break
        }

        case 'HEARTBEAT': {
          if (agentId) {
            registry.heartbeat(agentId)
            socket.send(
              JSON.stringify({
                type: 'HEARTBEAT_ACK',
                correlationId: msg.correlationId,
                payload: {},
              })
            )
          }
          break
        }

        case 'TASK_RESULT': {
          const payload = msg.payload as { taskId: string; result: unknown }
          if (agentId) {
            registry.setStatus(agentId, 'idle')
            eventBus.emit(
              WorkflowEventType.TASK_COMPLETED,
              `Task '${payload.taskId}' completed by agent '${agentId}'`,
              { agentId, taskId: payload.taskId, data: { result: payload.result } }
            )
          }
          // Forward result back to orchestrator
          const orch = orchestratorSockets.get(payload.taskId)
          if (orch?.readyState === 1) {
            orch.send(JSON.stringify({ type: 'TASK_RESULT', correlationId: msg.correlationId, payload }))
          }
          orchestratorSockets.delete(payload.taskId)
          break
        }

        case 'TASK_ERROR': {
          const payload = msg.payload as { taskId: string; error: string; retryable: boolean }
          if (agentId) {
            registry.setStatus(agentId, 'idle')
            eventBus.emit(
              WorkflowEventType.TASK_FAILED,
              `Task '${payload.taskId}' failed: ${payload.error}`,
              { agentId, taskId: payload.taskId }
            )
          }
          // Forward error back to orchestrator
          const orch = orchestratorSockets.get(payload.taskId)
          if (orch?.readyState === 1) {
            orch.send(JSON.stringify({ type: 'TASK_ERROR', correlationId: msg.correlationId, payload }))
          }
          orchestratorSockets.delete(payload.taskId)
          break
        }

        default:
          logger.warn({ type: msg.type }, 'Unhandled message type')
      }
    }
  })

  // Heartbeat watchdog — remove stale agents every 30s
  const watchdog = setInterval(() => {
    const stale = registry.getStale(HEARTBEAT_TIMEOUT_MS)
    for (const agent of stale) {
      logger.warn({ agentId: agent.id }, 'Agent heartbeat timeout — disconnecting')
      agent.socket.terminate()
      registry.unregister(agent.id)
      eventBus.emit(
        WorkflowEventType.AGENT_DISCONNECTED,
        `Agent '${agent.name}' timed out`,
        { agentId: agent.id }
      )
    }
  }, HEARTBEAT_INTERVAL_MS)

  server.on('close', () => clearInterval(watchdog))

  server.listen(port, () => {
    logger.info({ port }, 'OpenClaw Gateway listening')
  })

  return server
}
