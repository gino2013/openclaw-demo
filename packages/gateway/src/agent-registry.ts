import type { AgentId, AgentRole } from '@openclaw/core'
import { createLogger } from '@openclaw/core'
import type WebSocket from 'ws'

const logger = createLogger('gateway:registry')

/** Extended agent info stored in the registry */
export interface AgentInfo {
  id: AgentId
  name: string
  role: AgentRole
  capabilities: string[]
  socket: WebSocket
  connectedAt: string
  lastHeartbeat: string
  status: 'idle' | 'busy'
}

/**
 * In-memory registry of connected agents.
 * Maintains WebSocket references and agent metadata.
 */
export class AgentRegistry {
  private agents: Map<AgentId, AgentInfo> = new Map()

  /**
   * Register a new agent connection.
   */
  register(info: AgentInfo): void {
    this.agents.set(info.id, info)
    logger.info({ agentId: info.id, role: info.role }, 'Agent registered')
  }

  /**
   * Remove an agent from the registry.
   */
  unregister(agentId: AgentId): AgentInfo | undefined {
    const info = this.agents.get(agentId)
    if (info) {
      this.agents.delete(agentId)
      logger.info({ agentId }, 'Agent unregistered')
    }
    return info
  }

  /**
   * Update heartbeat timestamp for an agent.
   */
  heartbeat(agentId: AgentId): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.lastHeartbeat = new Date().toISOString()
    }
  }

  /**
   * Set an agent's busy/idle status.
   */
  setStatus(agentId: AgentId, status: 'idle' | 'busy'): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.status = status
    }
  }

  /**
   * Get all agents with a specific role.
   */
  getByRole(role: AgentRole): AgentInfo[] {
    return Array.from(this.agents.values()).filter((a) => a.role === role)
  }

  /**
   * Get a specific agent by ID.
   */
  get(agentId: AgentId): AgentInfo | undefined {
    return this.agents.get(agentId)
  }

  /**
   * Get all registered agents as a plain array (without socket refs).
   */
  getAll(): Omit<AgentInfo, 'socket'>[] {
    return Array.from(this.agents.values()).map(({ socket: _socket, ...rest }) => rest)
  }

  /**
   * Find stale agents that haven't sent a heartbeat within the timeout window.
   */
  getStale(timeoutMs: number): AgentInfo[] {
    const now = Date.now()
    return Array.from(this.agents.values()).filter(
      (a) => now - new Date(a.lastHeartbeat).getTime() > timeoutMs
    )
  }
}
