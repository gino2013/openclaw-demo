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
import type { AgentRole } from '@openclaw/core'
import { WorkflowEventType } from '@openclaw/core'

const SCALE = Number(process.env['NEXT_PUBLIC_OFFICE_SCALE'] ?? 4)
const NATIVE_W = 160
const NATIVE_H = 144

/**
 * Mounts the Pixi.js canvas and bridges Zustand state to the scene.
 * All Pixi logic lives in lib/pixi/; this component only wires React ↔ Pixi.
 */
export default function OfficeCanvas(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)

  const { agents, pendingAnimations, completeDelegation, events } = useOfficeStore()

  // Bootstrap Pixi
  useEffect(() => {
    if (!containerRef.current || appRef.current) return

    const app = new PIXI.Application()
    void app.init({
      width: NATIVE_W,
      height: NATIVE_H,
      backgroundColor: 0x306230,
      resolution: 1,
      autoDensity: false,
    }).then(() => {
      if (!containerRef.current) return
      appRef.current = app

      // Apply CSS pixel scaling
      const canvas = app.canvas as HTMLCanvasElement
      canvas.style.width = `${NATIVE_W * SCALE}px`
      canvas.style.height = `${NATIVE_H * SCALE}px`
      canvas.style.imageRendering = 'pixelated'
      containerRef.current.appendChild(canvas)

      initScene(app)
    })

    return () => {
      appRef.current?.destroy(true)
      appRef.current = null
    }
  }, [])

  // Sync agents → sprites
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
      className="flex items-center justify-center w-full h-full bg-gba-black"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
