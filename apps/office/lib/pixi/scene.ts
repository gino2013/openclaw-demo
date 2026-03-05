import * as PIXI from 'pixi.js'
import { buildTilemap, SEAT_POSITIONS, TILE_SIZE } from './tilemap'
import { AgentSprite } from './agent-sprite'
import type { AgentState } from './agent-sprite'
import { animateTaskDelegation } from './mail-animation'
import type { AgentRole } from '@openclaw/core'

const agentSprites = new Map<string, AgentSprite>()
let nextSeat = 0

/** Connection lines layer (drawn between agents like reference image) */
let connectionLayer: PIXI.Graphics | null = null

/**
 * Initialise the office scene.
 */
export function initScene(app: PIXI.Application): void {
  const tilemapLayer = new PIXI.Container()
  buildTilemap(tilemapLayer, app)
  app.stage.addChild(tilemapLayer)

  // Connection lines drawn below sprites
  connectionLayer = new PIXI.Graphics()
  app.stage.addChild(connectionLayer)
}

/** Redraw connection lines between orchestrator and all other agents */
function updateConnections(): void {
  if (!connectionLayer) return
  connectionLayer.clear()

  const orchEntry = Array.from(agentSprites.entries()).find(([, s]) => {
    // orchestrator sits at seat 0
    return s.container.x < TILE_SIZE * 12 && s.container.x > TILE_SIZE * 6 &&
           s.container.y > TILE_SIZE * 4 && s.container.y < TILE_SIZE * 9
  })
  if (!orchEntry) return

  const [, orchSprite] = orchEntry
  const orchCx = orchSprite.container.x + 16
  const orchCy = orchSprite.container.y + 16

  for (const [id, sprite] of agentSprites) {
    if (sprite === orchSprite) continue
    const cx = sprite.container.x + 16
    const cy = sprite.container.y + 16
    connectionLayer.moveTo(orchCx, orchCy).lineTo(cx, cy)
    connectionLayer.stroke({ color: 0xffffff, width: 1, alpha: 0.35 })

    // Dot at each end
    connectionLayer.circle(cx, cy, 2)
    connectionLayer.fill({ color: 0xffffff, alpha: 0.5 })
  }
}

/**
 * Add a new agent sprite to the scene.
 */
export function addAgentSprite(
  app: PIXI.Application,
  agentId: string,
  name: string,
  role: AgentRole
): void {
  if (agentSprites.has(agentId)) return

  // Orchestrator always at center (seat 0), others fill remaining seats
  let seatIndex: number
  if (role === 'orchestrator') {
    seatIndex = 0
  } else {
    // Start from seat 1 for non-orchestrators
    const used = new Set(Array.from(agentSprites.values()).map((_, i) => i))
    seatIndex = 1
    while (used.has(seatIndex) && seatIndex < SEAT_POSITIONS.length) seatIndex++
    nextSeat = Math.max(nextSeat, seatIndex + 1)
  }

  const seat = SEAT_POSITIONS[seatIndex] ?? SEAT_POSITIONS[nextSeat % SEAT_POSITIONS.length] ?? { x: 1, y: 1 }
  if (role !== 'orchestrator') nextSeat++

  const sprite = new AgentSprite(agentId, role, seat, app)
  sprite.setName(name)

  sprite.onPointerDown = (id) => {
    window.dispatchEvent(new CustomEvent('openclaw:agentclick', { detail: { agentId: id } }))
  }

  app.stage.addChild(sprite.container)
  agentSprites.set(agentId, sprite)
  updateConnections()
}

export function setAgentState(agentId: string, state: AgentState): void {
  agentSprites.get(agentId)?.setState(state)
}

export function removeAgentSprite(agentId: string): void {
  const s = agentSprites.get(agentId)
  if (s) { s.destroy(); agentSprites.delete(agentId) }
  updateConnections()
}

export function triggerDelegationAnimation(
  app: PIXI.Application,
  fromId: string,
  toId: string
): void {
  const from = agentSprites.get(fromId)
  const to = agentSprites.get(toId)
  if (!from || !to) return

  const fp = { x: from.container.x + 16, y: from.container.y + 16 }
  const tp = { x: to.container.x + 16,   y: to.container.y + 16 }

  animateTaskDelegation(app, fp, tp, () => {
    to.highlight()
    to.setState('working')
  })
}

/** Celebration: all agents jump + confetti */
export function playCelebration(app: PIXI.Application): void {
  const colors = [0xe03030, 0xffe000, 0x3060e0, 0x30a030, 0xff80c0]
  const particles: PIXI.Graphics[] = []

  for (let i = 0; i < 40; i++) {
    const g = new PIXI.Graphics()
    g.rect(0, 0, 3, 3)
    g.fill(colors[i % colors.length] ?? 0xffffff)
    g.position.set(Math.random() * app.screen.width, -4)
    app.stage.addChild(g)
    particles.push(g)
  }

  for (const sprite of agentSprites.values()) sprite.setState('success')

  let frame = 0
  const tick = (): void => {
    frame++
    for (const p of particles) {
      p.y += 2.5 + Math.random() * 2
      p.x += (Math.random() - 0.5) * 2
      p.rotation += 0.15
    }
    if (frame >= 120) {
      app.ticker.remove(tick)
      for (const p of particles) { app.stage.removeChild(p); p.destroy() }
      for (const sprite of agentSprites.values()) sprite.setState('idle')
    }
  }
  app.ticker.add(tick)
}
