'use client'

import { useEffect } from 'react'
import { WorkflowEventType } from '@openclaw/core'
import type { WorkflowEvent } from '@openclaw/core'
import { useOfficeStore } from './store'
import { v4 as uuidv4 } from 'uuid'

const SSE_URL = '/api/proxy/events'
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 30_000

let es: EventSource | null = null
let reconnectDelay = RECONNECT_BASE_MS

/**
 * Connects to the Gateway SSE stream and dispatches events to the Zustand store.
 * Implements exponential backoff reconnection.
 */
function connectSSE(): void {
  if (es) {
    es.close()
    es = null
  }

  es = new EventSource(SSE_URL)

  es.onopen = () => {
    reconnectDelay = RECONNECT_BASE_MS
    console.info('[SSE] Connected to Gateway events')
  }

  es.onerror = () => {
    es?.close()
    es = null
    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS)
      connectSSE()
    }, reconnectDelay)
  }

  // Listen for all event types
  const eventTypes = Object.values(WorkflowEventType)
  for (const type of eventTypes) {
    es.addEventListener(type, (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as WorkflowEvent
        handleEvent(event)
      } catch {
        console.error('[SSE] Failed to parse event', e.data)
      }
    })
  }
}

function handleEvent(event: WorkflowEvent): void {
  const store = useOfficeStore.getState()
  store.pushEvent(event)

  switch (event.type) {
    case WorkflowEventType.AGENT_CONNECTED: {
      if (event.agentId) {
        const data = event.data as Record<string, string> | undefined
        store.upsertAgent({
          id: event.agentId,
          name: data?.['name'] ?? event.agentId,
          role: data?.['role'] ?? 'custom',
          status: 'idle',
          taskProgress: 0,
          recentTasks: [],
          tokensUsed: 0,
          connectedAt: event.timestamp,
        })
      }
      break
    }

    case WorkflowEventType.AGENT_DISCONNECTED: {
      if (event.agentId) {
        store.updateAgent(event.agentId, { status: 'offline' })
      }
      break
    }

    case WorkflowEventType.AGENT_THINKING: {
      if (event.agentId) {
        store.updateAgent(event.agentId, { status: 'thinking' })
      }
      break
    }

    case WorkflowEventType.AGENT_IDLE: {
      if (event.agentId) {
        store.updateAgent(event.agentId, { status: 'idle', taskProgress: 0 })
      }
      break
    }

    case WorkflowEventType.TASK_DELEGATED: {
      const data = event.data as Record<string, string> | undefined
      if (data?.['fromAgentId'] && data?.['toAgentId'] && event.taskId) {
        store.triggerDelegation({
          id: uuidv4(),
          fromAgentId: data['fromAgentId'],
          toAgentId: data['toAgentId'],
          taskId: event.taskId,
          taskTitle: data['taskTitle'] ?? event.taskId,
        })
        store.updateAgent(data['toAgentId'], { status: 'working', currentTaskId: event.taskId })
      }
      break
    }

    case WorkflowEventType.TASK_RECEIVED: {
      if (event.agentId && event.taskId) {
        store.updateAgent(event.agentId, {
          status: 'working',
          currentTaskId: event.taskId,
        })
      }
      break
    }

    case WorkflowEventType.TASK_COMPLETED: {
      if (event.agentId) {
        const data = event.data as Record<string, unknown> | undefined
        const tokens = typeof data?.['tokensUsed'] === 'number' ? data['tokensUsed'] : 0
        store.updateAgent(event.agentId, {
          status: 'success',
          taskProgress: 100,
          currentTaskId: undefined,
          tokensUsed: (store.agents.get(event.agentId)?.tokensUsed ?? 0) + tokens,
        })
        store.addTokens(tokens)
      }
      break
    }

    case WorkflowEventType.TASK_FAILED: {
      if (event.agentId) {
        store.updateAgent(event.agentId, { status: 'error', currentTaskId: undefined })
      }
      break
    }
  }
}

/**
 * React hook that initialises the SSE connection once on mount.
 * Safe to call in multiple components — connection is shared.
 */
export function useSSEClient(): void {
  useEffect(() => {
    if (!es) connectSSE()
    return () => {
      // Keep connection alive across re-renders; only close on full unmount
    }
  }, [])
}
