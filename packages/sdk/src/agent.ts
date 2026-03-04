import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { createLogger, InvalidMessageError } from '@openclaw/core'
import type { AgentRole, Task, GatewayMessage, RegisterPayload, TaskAssignPayload } from '@openclaw/core'

const logger = createLogger('sdk:agent')

const HEARTBEAT_INTERVAL_MS = 25_000
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 30_000

/**
 * Base class for all OpenClaw agents.
 * Handles connection, registration, heartbeat, and task dispatching.
 *
 * @example
 * ```typescript
 * class MyDeveloperAgent extends OpenClawAgent {
 *   role = 'developer' as const
 *   capabilities = ['typescript', 'react']
 *
 *   async handle(task: Task): Promise<unknown> {
 *     // Implement your task logic here
 *     return { status: 'done', output: '...' }
 *   }
 * }
 *
 * const agent = new MyDeveloperAgent({ name: 'Dev-1' })
 * agent.start()
 * ```
 */
export abstract class OpenClawAgent {
  /** The functional role of this agent — used for routing */
  abstract readonly role: AgentRole

  /** Capabilities advertised to the Orchestrator */
  abstract readonly capabilities: string[]

  /** Handle an incoming task and return the result */
  abstract handle(task: Task): Promise<unknown>

  private ws: WebSocket | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectDelay = RECONNECT_BASE_MS

  protected readonly agentId: string
  protected readonly name: string
  protected readonly gatewayUrl: string
  protected readonly token: string

  constructor(options: { name: string; agentId?: string }) {
    this.name = options.name
    this.agentId = options.agentId ?? uuidv4()
    this.gatewayUrl = process.env['OPENCLAW_GATEWAY_URL'] ?? 'ws://127.0.0.1:18789'
    this.token = process.env['OPENCLAW_GATEWAY_TOKEN'] ?? ''
  }

  /** Connect to the Gateway and start the agent. */
  start(): void {
    logger.info({ agentId: this.agentId, name: this.name, role: this.role }, 'Starting agent')
    this.connect()
  }

  /** Gracefully disconnect the agent. */
  stop(): void {
    this.clearHeartbeat()
    this.ws?.close()
    this.ws = null
    logger.info({ agentId: this.agentId }, 'Agent stopped')
  }

  private connect(): void {
    this.ws = new WebSocket(this.gatewayUrl)

    this.ws.on('open', () => {
      this.reconnectDelay = RECONNECT_BASE_MS
      this.register()
      this.startHeartbeat()
      logger.info({ agentId: this.agentId }, 'Connected to Gateway')
    })

    this.ws.on('message', (raw) => {
      let msg: GatewayMessage
      try {
        msg = JSON.parse(raw.toString()) as GatewayMessage
      } catch {
        throw new InvalidMessageError('Non-JSON message from Gateway', raw.toString())
      }
      void this.handleMessage(msg)
    })

    this.ws.on('close', () => {
      this.clearHeartbeat()
      logger.warn({ agentId: this.agentId }, 'Disconnected — scheduling reconnect')
      this.scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      logger.error({ err, agentId: this.agentId }, 'WebSocket error')
    })
  }

  private register(): void {
    const payload: RegisterPayload = {
      agentId: this.agentId,
      name: this.name,
      role: this.role,
      capabilities: this.capabilities,
      token: this.token,
    }
    this.send({ type: 'REGISTER', correlationId: uuidv4(), payload })
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'HEARTBEAT', correlationId: uuidv4(), payload: {} })
    }, HEARTBEAT_INTERVAL_MS)
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private async handleMessage(msg: GatewayMessage): Promise<void> {
    switch (msg.type) {
      case 'TASK_ASSIGN': {
        const { task } = msg.payload as TaskAssignPayload
        logger.info({ taskId: task.id, title: task.title }, 'Task received')

        try {
          const result = await this.handle(task)
          this.send({
            type: 'TASK_RESULT',
            correlationId: msg.correlationId,
            payload: { taskId: task.id, result },
          })
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err)
          this.send({
            type: 'TASK_ERROR',
            correlationId: msg.correlationId,
            payload: { taskId: task.id, error, retryable: false },
          })
        }
        break
      }

      case 'HEARTBEAT_ACK':
      case 'REGISTER_ACK':
        break

      default:
        logger.debug({ type: msg.type }, 'Unhandled message type')
    }
  }

  private send(msg: GatewayMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private scheduleReconnect(): void {
    setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS)
      this.connect()
    }, this.reconnectDelay)
  }
}
