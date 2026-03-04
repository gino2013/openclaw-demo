'use client'

import { useOfficeStore } from '@/lib/store'

/**
 * Top HUD bar — Pokemon battle info bar style.
 * Shows: title | task progress | token count
 */
export default function HUD(): React.JSX.Element {
  const { agents, totalTokens, events } = useOfficeStore()

  const connected = Array.from(agents.values()).filter((a) => a.status !== 'offline').length
  const working = Array.from(agents.values()).filter((a) => a.status === 'working').length
  const latestTask = events.find((e) =>
    e.type === 'TASK_RECEIVED' || e.type === 'TASK_DELEGATED'
  )

  return (
    <div className="hud-bar flex items-center justify-between px-3 py-1 bg-gba-black border-b-2 border-gba-green text-gba-white">
      {/* Left: title */}
      <span className="text-gba-light-green text-xs">🦀 OpenClaw Office</span>

      {/* Center: agent status */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gba-beige">
          Agents: <span className="text-gba-light-green">{connected}</span> online
        </span>
        {working > 0 && (
          <span className="text-yellow-400 blink">
            ⚙ {working} working
          </span>
        )}
        {latestTask && (
          <span className="text-gray-400 truncate max-w-40" title={latestTask.message}>
            {latestTask.message.slice(0, 30)}…
          </span>
        )}
      </div>

      {/* Right: token counter */}
      <div className="text-xs text-gba-beige">
        Tokens: <span className="text-yellow-400">{totalTokens.toLocaleString()}</span>
      </div>
    </div>
  )
}
