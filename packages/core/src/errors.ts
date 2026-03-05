/**
 * Base error class for all OpenClaw errors.
 * Provides structured error codes and context for debugging.
 */
export class OpenClawError extends Error {
  /** Machine-readable error code */
  public readonly code: string
  /** Additional context for debugging */
  public readonly context?: Record<string, unknown>

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message)
    this.name = 'OpenClawError'
    this.code = code
    if (context !== undefined) this.context = context
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Authentication or authorization failure */
export class AuthError extends OpenClawError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', context)
    this.name = 'AuthError'
  }
}

/** Agent not found or unavailable */
export class AgentNotFoundError extends OpenClawError {
  constructor(agentId: string, role?: string) {
    super(
      `No available agent found${role ? ` with role '${role}'` : ''} (id: ${agentId})`,
      'AGENT_NOT_FOUND',
      { agentId, role }
    )
    this.name = 'AgentNotFoundError'
  }
}

/** Task timed out waiting for completion */
export class TaskTimeoutError extends OpenClawError {
  constructor(taskId: string, timeoutMs: number) {
    super(`Task '${taskId}' timed out after ${timeoutMs}ms`, 'TASK_TIMEOUT', { taskId, timeoutMs })
    this.name = 'TaskTimeoutError'
  }
}

/** Task failed after all retry attempts */
export class TaskFailedError extends OpenClawError {
  constructor(taskId: string, reason: string, retries: number) {
    super(`Task '${taskId}' failed after ${retries} retries: ${reason}`, 'TASK_FAILED', {
      taskId,
      reason,
      retries,
    })
    this.name = 'TaskFailedError'
  }
}

/** Invalid or malformed message received */
export class InvalidMessageError extends OpenClawError {
  constructor(message: string, raw?: unknown) {
    super(message, 'INVALID_MESSAGE', { raw })
    this.name = 'InvalidMessageError'
  }
}
