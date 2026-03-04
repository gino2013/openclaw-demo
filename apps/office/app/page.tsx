'use client'

import dynamic from 'next/dynamic'
import HUD from '@/components/HUD'
import AgentPanel from '@/components/AgentPanel'
import EventLog from '@/components/EventLog'
import { useSSEClient } from '@/lib/sse-client'

// Pixi.js must be loaded client-side only (no SSR)
const OfficeCanvas = dynamic(() => import('@/components/OfficeCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full text-gba-light-green text-xs font-pixel">
      Loading office...
    </div>
  ),
})

/**
 * Main office page — fullscreen canvas with HUD overlay panels.
 */
export default function OfficePage(): React.JSX.Element {
  // Connect SSE and populate Zustand store
  useSSEClient()

  return (
    <div className="flex flex-col w-screen h-screen bg-gba-black overflow-hidden">
      {/* Top HUD bar */}
      <HUD />

      {/* Main content: canvas + right panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Office canvas — takes remaining space */}
        <div className="flex-1 relative">
          <OfficeCanvas />
        </div>

        {/* Right side panel */}
        <AgentPanel />
      </div>

      {/* Bottom event log */}
      <EventLog />
    </div>
  )
}
