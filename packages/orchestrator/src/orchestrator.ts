import WebSocket from 'ws'
import http from 'node:http'
import { v4 as uuidv4 } from 'uuid'
import {
  createLogger,
  TaskTimeoutError,
  TaskFailedError,
  InvalidMessageError,
} from '@openclaw/core'
import type { Task, GatewayMessage, TaskAssignPayload, TaskResultPayload, TaskErrorPayload } from '@openclaw/core'
import { RoundRobinRouter } from './router'
import type { RoutableAgent } from './router'

const logger = createLogger('orchestrator')

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 3
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 30_000

interface PendingTask {
  task: Task
  resolve: (result: unknown) => void
  reject: (err: Error) => void
  timeoutHandle: NodeJS.Timeout
  retries: number
}

/**
 * OpenClaw Orchestrator.
 * Connects to the Gateway, routes tasks to agents, and handles retries + timeouts.
 */
export class Orchestrator {
  private ws: WebSocket | null = null
  private router = new RoundRobinRouter()
  private pending: Map<string, PendingTask> = new Map()
  private agents: Map<string, RoutableAgent> = new Map()
  private reconnectDelay = RECONNECT_BASE_MS
  private connected = false

  private readonly gatewayUrl: string
  private readonly timeoutMs: number
  private readonly maxRetries: number

  constructor() {
    this.gatewayUrl = process.env['OPENCLAW_GATEWAY_URL'] ?? 'ws://127.0.0.1:18789'
    this.timeoutMs = Number(process.env['OPENCLAW_ORCHESTRATOR_TIMEOUT_MS'] ?? DEFAULT_TIMEOUT_MS)
    this.maxRetries = Number(process.env['OPENCLAW_ORCHESTRATOR_MAX_RETRIES'] ?? DEFAULT_MAX_RETRIES)
  }

  /** Connect to the Gateway and start listening for messages. */
  connect(): void {
    logger.info({ url: this.gatewayUrl }, 'Connecting to Gateway')
    this.ws = new WebSocket(this.gatewayUrl)

    this.ws.on('open', () => {
      this.connected = true
      this.reconnectDelay = RECONNECT_BASE_MS
      logger.info('Connected to Gateway')
      void this.syncAgents()
    })

    this.ws.on('message', (raw) => {
      let msg: GatewayMessage
      try {
        msg = JSON.parse(raw.toString()) as GatewayMessage
      } catch {
        throw new InvalidMessageError('Non-JSON message from Gateway', raw.toString())
      }
      this.handleMessage(msg)
    })

    this.ws.on('close', () => {
      this.connected = false
      logger.warn('Disconnected from Gateway — scheduling reconnect')
      this.scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      logger.error({ err }, 'Gateway WebSocket error')
    })
  }

  /**
   * Dispatch a task to an available agent.
   * Returns a promise that resolves with the agent's result.
   *
   * @throws {AgentNotFoundError} if no idle agent with the required role exists
   * @throws {TaskTimeoutError} if the task exceeds the configured timeout
   * @throws {TaskFailedError} if the task fails after all retries
   */
  dispatch(task: Omit<Task, 'id' | 'status' | 'delegationChain' | 'createdAt' | 'updatedAt'>): Promise<unknown> {
    const fullTask: Task = {
      ...task,
      id: uuidv4(),
      status: 'pending',
      delegationChain: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return this.attemptDispatch(fullTask, 0)
  }

  private attemptDispatch(task: Task, attempt: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const agent = this.router.select(Array.from(this.agents.values()), task.requiredRole)

      task.status = 'delegated'
      task.delegationChain.push(agent.id)
      task.updatedAt = new Date().toISOString()

      const msg: GatewayMessage<TaskAssignPayload> = {
        type: 'TASK_ASSIGN',
        correlationId: task.id,
        payload: { task },
      }

      const timeoutHandle = setTimeout(() => {
        this.pending.delete(task.id)
        reject(new TaskTimeoutError(task.id, this.timeoutMs))
      }, this.timeoutMs)

      this.pending.set(task.id, { task, resolve, reject, timeoutHandle, retries: attempt })

      this.ws?.send(JSON.stringify(msg))
      logger.info({ taskId: task.id, agentId: agent.id, attempt }, 'Task dispatched')
    })
  }

  private handleMessage(msg: GatewayMessage): void {
    switch (msg.type) {
      case 'TASK_RESULT': {
        const payload = msg.payload as TaskResultPayload
        const pending = this.pending.get(payload.taskId)
        if (pending) {
          clearTimeout(pending.timeoutHandle)
          this.pending.delete(payload.taskId)
          pending.resolve(payload.result)
        }
        break
      }

      case 'TASK_ERROR': {
        const payload = msg.payload as TaskErrorPayload
        const pending = this.pending.get(payload.taskId)
        if (!pending) break

        if (payload.retryable && pending.retries < this.maxRetries) {
          logger.warn({ taskId: payload.taskId, retries: pending.retries }, 'Retrying task')
          clearTimeout(pending.timeoutHandle)
          this.pending.delete(payload.taskId)
          void this.attemptDispatch(pending.task, pending.retries + 1).then(
            pending.resolve,
            pending.reject
          )
        } else {
          clearTimeout(pending.timeoutHandle)
          this.pending.delete(payload.taskId)
          pending.reject(new TaskFailedError(payload.taskId, payload.error, pending.retries))
        }
        break
      }

      default:
        logger.debug({ type: msg.type }, 'Unhandled message type in orchestrator')
    }
  }

  /** Fetch current agent list from Gateway REST API and populate local registry. */
  private syncAgents(): Promise<void> {
    const restUrl = this.gatewayUrl.replace(/^ws/, 'http') + '/agents'
    return new Promise((resolve) => {
      http.get(restUrl, (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => { data += chunk.toString() })
        res.on('end', () => {
          try {
            const body = JSON.parse(data) as { agents: Array<{ id: string; role: string; status: string }> }
            for (const agent of body.agents) {
              this.agents.set(agent.id, {
                id: agent.id,
                role: agent.role as RoutableAgent['role'],
                status: agent.status === 'busy' ? 'busy' : 'idle',
              })
            }
            logger.info({ count: body.agents.length }, 'Synced agents from Gateway')
          } catch {
            logger.warn('Failed to parse agent list from Gateway')
          }
          resolve()
        })
      }).on('error', () => {
        logger.warn('Could not reach Gateway REST API for agent sync')
        resolve()
      })
    })
  }

  private scheduleReconnect(): void {
    setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS)
      this.connect()
    }, this.reconnectDelay)
  }
}
