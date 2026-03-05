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
import { CANVAS_W, CANVAS_H } from '@/lib/pixi/tilemap'
import type { AgentRole } from '@openclaw/core'
import { WorkflowEventType } from '@openclaw/core'

export default function OfficeCanvas(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)

  const { agents, pendingAnimations, completeDelegation, events } = useOfficeStore()

  useEffect(() => {
    if (!containerRef.current || appRef.current) return
    const el = containerRef.current
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1

    const app = new PIXI.Application()
    void preloadSprites().then(() =>
      app.init({
        width: CANVAS_W,
        height: CANVAS_H,
        resolution: dpr,
        autoDensity: true,   // CSS canvas = CANVAS_W×CANVAS_H, internal = ×dpr
        backgroundColor: 0x1a1a2e,
        antialias: false,
      })
    ).then(() => {
      if (!el) return
      appRef.current = app

      const canvas = app.canvas as HTMLCanvasElement
      // Let CSS handle sizing — avoids all JS timing / layout race conditions
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.imageRendering = 'pixelated'
      canvas.style.display = 'block'
      el.appendChild(canvas)

      initScene(app)

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

  useEffect(() => {
    const app = appRef.current
    if (!app) return
    for (const [id, agent] of agents) {
      addAgentSprite(app, id, agent.name, agent.role as AgentRole)
      setAgentState(id, agent.status)
    }
  }, [agents])

  useEffect(() => {
    const app = appRef.current
    if (!app) return
    for (const anim of pendingAnimations) {
      triggerDelegationAnimation(app, anim.fromAgentId, anim.toAgentId)
      completeDelegation(anim.id)
    }
  }, [pendingAnimations, completeDelegation])

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
      className="w-full h-full bg-gba-black overflow-hidden"
    />
  )
}
