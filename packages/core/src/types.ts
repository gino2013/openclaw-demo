/**
 * Core shared types for the OpenClaw multi-agent framework.
 */

/** Unique identifier type alias for clarity */
export type AgentId = string
export type TaskId = string

/** Agent role — determines routing and sprite color in the Office UI */
export type AgentRole = 'orchestrator' | 'developer' | 'reviewer' | 'analyst' | 'custom'

/** Lifecycle states of an agent connection */
export type AgentConnectionStatus = 'connected' | 'disconnected' | 'idle' | 'busy'

/** Task execution lifecycle */
export type TaskStatus = 'pending' | 'delegated' | 'in_progress' | 'completed' | 'failed' | 'timeout'

/**
 * An agent registered with the Gateway.
 */
export interface Agent {
  /** Unique agent identifier */
  id: AgentId
  /** Human-readable display name */
  name: string
  /** Functional role used for task routing */
  role: AgentRole
  /** Capabilities advertised by this agent */
  capabilities: string[]
  /** Current connection status */
  status: AgentConnectionStatus
  /** ISO timestamp of last heartbeat */
  lastHeartbeat: string
  /** ISO timestamp when the agent connected */
  connectedAt: string
}

/**
 * A unit of work dispatched through OpenClaw.
 */
export interface Task {
  /** Unique task identifier */
  id: TaskId
  /** Short description of the task */
  title: string
  /** Full task payload / instructions */
  payload: unknown
  /** Role required to handle this task */
  requiredRole: AgentRole
  /** Current task status */
  status: TaskStatus
  /** Chain of agent IDs that have handled this task */
  delegationChain: AgentId[]
  /** ISO timestamp when the task was created */
  createdAt: string
  /** ISO timestamp when the task was last updated */
  updatedAt: string
  /** Optional metadata attached by agents */
  metadata?: Record<string, unknown>
}

/** Enum-style constant for all workflow event types */
export const WorkflowEventType = {
  TASK_RECEIVED: 'TASK_RECEIVED',
  TASK_DELEGATED: 'TASK_DELEGATED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_FAILED: 'TASK_FAILED',
  AGENT_CONNECTED: 'AGENT_CONNECTED',
  AGENT_DISCONNECTED: 'AGENT_DISCONNECTED',
  AGENT_THINKING: 'AGENT_THINKING',
  AGENT_IDLE: 'AGENT_IDLE',
} as const

export type WorkflowEventType = (typeof WorkflowEventType)[keyof typeof WorkflowEventType]

/**
 * A structured event emitted by the Gateway for SSE consumers.
 */
export interface WorkflowEvent {
  /** Unique event identifier */
  id: string
  /** Event classification */
  type: WorkflowEventType
  /** ISO timestamp of the event */
  timestamp: string
  /** ID of the agent that triggered the event, if applicable */
  agentId?: AgentId
  /** Task associated with this event, if applicable */
  taskId?: TaskId
  /** Human-readable event message */
  message: string
  /** Optional structured payload */
  data?: Record<string, unknown>
}

/**
 * Messages exchanged over the WebSocket between agents and the Gateway.
 */
export type GatewayMessageType =
  | 'REGISTER'
  | 'REGISTER_ACK'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'TASK_ASSIGN'
  | 'TASK_RESULT'
  | 'TASK_ERROR'
  | 'DISCONNECT'

export interface GatewayMessage<T = unknown> {
  /** Message type discriminant */
  type: GatewayMessageType
  /** Correlation ID for request/response matching */
  correlationId?: string
  /** Message payload */
  payload: T
}

/** Payload for REGISTER messages */
export interface RegisterPayload {
  agentId: AgentId
  name: string
  role: AgentRole
  capabilities: string[]
  token: string
}

/** Payload for TASK_ASSIGN messages */
export interface TaskAssignPayload {
  task: Task
}

/** Payload for TASK_RESULT messages */
export interface TaskResultPayload {
  taskId: TaskId
  result: unknown
  tokensUsed?: number
}

/** Payload for TASK_ERROR messages */
export interface TaskErrorPayload {
  taskId: TaskId
  error: string
  retryable: boolean
}
