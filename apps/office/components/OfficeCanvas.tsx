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

      // Use getBoundingClientRect for accurate post-layout dimensions
      const rect = el.getBoundingClientRect()
      const cw = Math.floor(rect.width)
      const ch = Math.floor(rect.height)
      const scale = cw > 0 && ch > 0 ? Math.min(cw / CANVAS_W, ch / CANVAS_H) : 1
      const displayW = Math.round(CANVAS_W * scale)
      const displayH = Math.round(CANVAS_H * scale)

      // Absolute centering avoids the flex justify-center overflow bug
      // where the left side gets clipped by overflow-hidden ancestors
      canvas.style.position = 'absolute'
      canvas.style.left = `${Math.round((cw - displayW) / 2)}px`
      canvas.style.top  = `${Math.round((ch - displayH) / 2)}px`
      canvas.style.width = `${displayW}px`
      canvas.style.height = `${displayH}px`
      canvas.style.imageRendering = 'pixelated'
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
      className="relative w-full h-full bg-gba-black overflow-hidden"
    />
  )
}
