'use client'

import { useOfficeStore } from '@/lib/store'
import type { AgentVisualState } from '@/lib/store'

const STATUS_COLORS: Record<AgentVisualState, string> = {
  idle:     'bg-gba-green text-white',
  thinking: 'bg-blue-600 text-white',
  working:  'bg-yellow-500 text-black',
  success:  'bg-green-500 text-black',
  error:    'bg-red-600 text-white',
  offline:  'bg-gray-600 text-gray-300',
}

const ROLE_DOTS: Record<string, string> = {
  orchestrator: 'bg-red-500',
  developer:    'bg-blue-500',
  reviewer:     'bg-green-500',
  analyst:      'bg-yellow-400',
  custom:       'bg-purple-500',
}

/**
 * Right-side agent status panel — Pokemon party list style.
 * Shows each agent with: sprite dot | name | role | HP bar | status badge.
 */
export default function AgentPanel(): React.JSX.Element {
  const { agents } = useOfficeStore()
  const agentList = Array.from(agents.values())

  return (
    <div className="w-44 bg-gba-dark border-l-2 border-gba-green flex flex-col overflow-y-auto">
      <div className="px-2 py-1 border-b border-gba-green text-gba-light-green text-xs">
        AGENTS
      </div>

      {agentList.length === 0 && (
        <div className="px-2 py-4 text-gray-500 text-xs text-center">
          No agents
          <br />
          connected
        </div>
      )}

      {agentList.map((agent) => (
        <div
          key={agent.id}
          className="px-2 py-2 border-b border-gray-800 hover:bg-gray-900 transition-colors"
        >
          {/* Name row */}
          <div className="flex items-center gap-1 mb-1">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${ROLE_DOTS[agent.role] ?? 'bg-purple-500'}`}
            />
            <span className="text-gba-white text-xs truncate flex-1">{agent.name}</span>
          </div>

          {/* Role */}
          <div className="text-gray-400 text-xs mb-1">{agent.role}</div>

          {/* HP bar = task progress */}
          <div className="w-full h-1.5 bg-gray-700 rounded mb-1">
            <div
              className={`h-full rounded transition-all duration-500 ${
                agent.taskProgress > 66 ? 'bg-gba-green' :
                agent.taskProgress > 33 ? 'bg-yellow-400' :
                'bg-red-500'
              }`}
              style={{ width: `${agent.taskProgress}%` }}
            />
          </div>

          {/* Status badge */}
          <span
            className={`inline-block text-xs px-1 py-0.5 rounded ${STATUS_COLORS[agent.status]}`}
          >
            {agent.status}
          </span>
        </div>
      ))}
    </div>
  )
}
