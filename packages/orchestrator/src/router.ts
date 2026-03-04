import type { AgentId, AgentRole } from '@openclaw/core'
import { createLogger, AgentNotFoundError } from '@openclaw/core'

const logger = createLogger('orchestrator:router')

/** Minimal agent descriptor used by the router */
export interface RoutableAgent {
  id: AgentId
  role: AgentRole
  status: 'idle' | 'busy'
}

/**
 * Round-Robin router for agent selection.
 * Given a list of available agents, picks the next idle one per role.
 */
export class RoundRobinRouter {
  /** Per-role cursor for round-robin selection */
  private cursors: Map<AgentRole, number> = new Map()

  /**
   * Select the next available idle agent for the given role.
   *
   * @throws {AgentNotFoundError} if no idle agent is found for the role
   */
  select(agents: RoutableAgent[], role: AgentRole): RoutableAgent {
    const candidates = agents.filter((a) => a.role === role && a.status === 'idle')
    if (candidates.length === 0) {
      throw new AgentNotFoundError('none', role)
    }

    const cursor = this.cursors.get(role) ?? 0
    const index = cursor % candidates.length
    this.cursors.set(role, index + 1)

    const selected = candidates[index]
    if (!selected) throw new AgentNotFoundError('none', role)

    logger.debug({ agentId: selected.id, role }, 'Agent selected via round-robin')
    return selected
  }
}
