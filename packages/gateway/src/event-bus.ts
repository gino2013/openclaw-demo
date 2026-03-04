import type { WorkflowEvent, WorkflowEventType } from '@openclaw/core'
import { createLogger } from '@openclaw/core'
import type { Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

const logger = createLogger('gateway:event-bus')

/**
 * Simple SSE event bus.
 * Maintains a list of connected SSE clients and broadcasts WorkflowEvents.
 */
export class EventBus {
  private clients: Set<Response> = new Set()
  private history: WorkflowEvent[] = []
  private readonly maxHistory = 100

  /**
   * Add a new SSE client connection.
   */
  addClient(res: Response): void {
    this.clients.add(res)
    logger.debug({ clientCount: this.clients.size }, 'SSE client connected')

    // Send buffered history to new client
    for (const event of this.history.slice(-10)) {
      this.sendToClient(res, event)
    }
  }

  /**
   * Remove an SSE client connection.
   */
  removeClient(res: Response): void {
    this.clients.delete(res)
    logger.debug({ clientCount: this.clients.size }, 'SSE client disconnected')
  }

  /**
   * Emit a workflow event to all connected SSE clients.
   */
  emit(
    type: WorkflowEventType,
    message: string,
    data?: Partial<Omit<WorkflowEvent, 'id' | 'type' | 'timestamp' | 'message'>>
  ): WorkflowEvent {
    const event: WorkflowEvent = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      message,
      ...data,
    }

    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    for (const client of this.clients) {
      this.sendToClient(client, event)
    }

    logger.debug({ eventType: type, clientCount: this.clients.size }, 'Event broadcast')
    return event
  }

  private sendToClient(res: Response, event: WorkflowEvent): void {
    try {
      res.write(`id: ${event.id}\n`)
      res.write(`event: ${event.type}\n`)
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    } catch {
      // Client disconnected mid-write; will be cleaned up on close
    }
  }
}
