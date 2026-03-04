import { create } from 'zustand'
import type { WorkflowEvent } from '@openclaw/core'

/** Visual state of an agent in the office */
export type AgentVisualState = 'idle' | 'thinking' | 'working' | 'success' | 'error' | 'offline'

/** Agent data held in the office store */
export interface OfficeAgent {
  id: string
  name: string
  role: string
  status: AgentVisualState
  currentTaskId?: string
  currentTaskTitle?: string
  taskProgress: number
  recentTasks: string[]
  tokensUsed: number
  connectedAt?: string
}

/** Pending delegation animation between two agents */
export interface DelegationAnimation {
  id: string
  fromAgentId: string
  toAgentId: string
  taskId: string
  taskTitle: string
}

export interface OfficeStore {
  agents: Map<string, OfficeAgent>
  events: WorkflowEvent[]
  totalTokens: number
  pendingAnimations: DelegationAnimation[]

  // Actions
  updateAgent: (agentId: string, patch: Partial<OfficeAgent>) => void
  upsertAgent: (agent: OfficeAgent) => void
  removeAgent: (agentId: string) => void
  pushEvent: (event: WorkflowEvent) => void
  triggerDelegation: (anim: DelegationAnimation) => void
  completeDelegation: (animId: string) => void
  addTokens: (count: number) => void
}

/** Maximum events kept in the log */
const MAX_EVENTS = 50

export const useOfficeStore = create<OfficeStore>((set) => ({
  agents: new Map(),
  events: [],
  totalTokens: 0,
  pendingAnimations: [],

  updateAgent: (agentId, patch) =>
    set((state) => {
      const agent = state.agents.get(agentId)
      if (!agent) return state
      const next = new Map(state.agents)
      next.set(agentId, { ...agent, ...patch })
      return { agents: next }
    }),

  upsertAgent: (agent) =>
    set((state) => {
      const next = new Map(state.agents)
      next.set(agent.id, agent)
      return { agents: next }
    }),

  removeAgent: (agentId) =>
    set((state) => {
      const next = new Map(state.agents)
      next.delete(agentId)
      return { agents: next }
    }),

  pushEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, MAX_EVENTS),
    })),

  triggerDelegation: (anim) =>
    set((state) => ({
      pendingAnimations: [...state.pendingAnimations, anim],
    })),

  completeDelegation: (animId) =>
    set((state) => ({
      pendingAnimations: state.pendingAnimations.filter((a) => a.id !== animId),
    })),

  addTokens: (count) =>
    set((state) => ({ totalTokens: state.totalTokens + count })),
}))
