'use client'

import { useOfficeStore } from '@/lib/store'

const EVENT_COLORS: Record<string, string> = {
  AGENT_CONNECTED:    'text-green-400',
  AGENT_DISCONNECTED: 'text-red-400',
  TASK_RECEIVED:      'text-yellow-300',
  TASK_DELEGATED:     'text-blue-300',
  TASK_COMPLETED:     'text-green-300',
  TASK_FAILED:        'text-red-300',
  AGENT_THINKING:     'text-blue-400',
  AGENT_IDLE:         'text-gray-400',
}

/**
 * Bottom event log — Pokemon dialog box style.
 * Shows last 5 events with blinking scroll indicator.
 */
export default function EventLog(): React.JSX.Element {
  const { events } = useOfficeStore()
  const recent = events.slice(0, 5)

  return (
    <div className="dialog-box bg-gba-white border-t-2 border-gba-black px-3 py-2 h-20 flex flex-col justify-between">
      <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
        {recent.length === 0 ? (
          <span className="text-gray-400 text-xs">Waiting for events...</span>
        ) : (
          recent.map((event) => (
            <div key={event.id} className="flex items-start gap-2 text-xs leading-tight">
              <span className={`flex-shrink-0 ${EVENT_COLORS[event.type] ?? 'text-gray-400'}`}>
                [{event.type.replace(/_/g, ' ')}]
              </span>
              <span className="text-gba-black truncate">{event.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Scroll indicator */}
      {events.length > 5 && (
        <div className="text-right text-gray-500 text-xs blink">▼</div>
      )}
    </div>
  )
}
