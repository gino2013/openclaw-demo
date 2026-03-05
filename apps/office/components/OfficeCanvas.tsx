'use client'

import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { useOfficeStore } from '@/lib/store'
import {
  initScene,
  addAgentSprite,
  setAgentState,
  triggerDelegationAnimation,
  playCelebration,
} from '@/lib/pixi/scene'
import { preloadSprites } from '@/lib/pixi/preload-sprites'
import type { AgentRole } from '@openclaw/core'
import { WorkflowEventType } from '@openclaw/core'

const SCALE = Number(process.env['NEXT_PUBLIC_OFFICE_SCALE'] ?? 2)
const NATIVE_W = 320
const NATIVE_H = 240

export default function OfficeCanvas(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)

  const { agents, pendingAnimations, completeDelegation, events } = useOfficeStore()

  // Bootstrap Pixi — preload sprites first, then init scene
  useEffect(() => {
    if (!containerRef.current || appRef.current) return

    const app = new PIXI.Application()
    void preloadSprites().then(() =>
      app.init({
        width: NATIVE_W,
        height: NATIVE_H,
        backgroundColor: 0x1a1a2e,
        resolution: 1,
        autoDensity: false,
      })
    ).then(() => {
      if (!containerRef.current) return
      appRef.current = app

      const canvas = app.canvas as HTMLCanvasElement
      canvas.style.width = `${NATIVE_W * SCALE}px`
      canvas.style.height = `${NATIVE_H * SCALE}px`
      canvas.style.imageRendering = 'pixelated'
      canvas.style.display = 'block'
      containerRef.current.appendChild(canvas)

      initScene(app)

      // Sync agents that arrived before Pixi was ready
      const { agents: currentAgents } = useOfficeStore.getState()
      for (const [id, agent] of currentAgents) {
        addAgentSprite(app, id, agent.name, agent.role as AgentRole)
        setAgentState(id, agent.status)
      }
    })

    return () => {
      appRef.current?.destroy(true)
      appRef.current = null
    }
  }, [])

  // Sync agents → sprites (handles agents that arrive after Pixi is ready)
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    for (const [id, agent] of agents) {
      addAgentSprite(app, id, agent.name, agent.role as AgentRole)
      setAgentState(id, agent.status)
    }
  }, [agents])

  // Play delegation animations
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    for (const anim of pendingAnimations) {
      triggerDelegationAnimation(app, anim.fromAgentId, anim.toAgentId)
      completeDelegation(anim.id)
    }
  }, [pendingAnimations, completeDelegation])

  // Celebration on task complete
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    const latest = events[0]
    if (latest?.type === WorkflowEventType.TASK_COMPLETED) {
      playCelebration(app)
    }
  }, [events])

  return (
    <div
      ref={containerRef}
      className="flex items-start justify-start w-full h-full bg-gba-black overflow-hidden"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
