import * as PIXI from 'pixi.js'
import { buildTilemap, SEAT_POSITIONS, TILE_SIZE } from './tilemap'
import { AgentSprite } from './agent-sprite'
import type { AgentState } from './agent-sprite'
import { animateTaskDelegation } from './mail-animation'
import type { AgentRole } from '@openclaw/core'

const agentSprites = new Map<string, AgentSprite>()
/** Tracks which seat index each agent occupies (fixes overlap bug) */
const agentSeats = new Map<string, number>()

let connectionLayer: PIXI.Graphics | null = null

export function initScene(app: PIXI.Application): void {
  const tilemapLayer = new PIXI.Container()
  buildTilemap(tilemapLayer, app)
  app.stage.addChild(tilemapLayer)

  connectionLayer = new PIXI.Graphics()
  app.stage.addChild(connectionLayer)
}

/** Redraw connection lines between all agents */
function updateConnections(): void {
  if (!connectionLayer || agentSprites.size < 2) return
  connectionLayer.clear()

  const sprites = Array.from(agentSprites.values())
  // Draw from first agent (typically lowest seat) to all others
  const hub = sprites[0]!
  const hubCx = hub.container.x + 24
  const hubCy = hub.container.y + 24

  for (let i = 1; i < sprites.length; i++) {
    const s = sprites[i]!
    const cx = s.container.x + 24
    const cy = s.container.y + 24
    connectionLayer.moveTo(hubCx, hubCy).lineTo(cx, cy)
    connectionLayer.stroke({ color: 0xffffff, width: 1, alpha: 0.3 })
    connectionLayer.circle(cx, cy, 2)
    connectionLayer.fill({ color: 0xffffff, alpha: 0.5 })
  }
}

export function addAgentSprite(
  app: PIXI.Application,
  agentId: string,
  name: string,
  role: AgentRole
): void {
  if (agentSprites.has(agentId)) return

  // Orchestrator always at center seat 0; others take the next free seat from 1 onward
  let seatIndex: number
  if (role === 'orchestrator') {
    seatIndex = 0
  } else {
    // Use the actual seat values stored in agentSeats (not array indices)
    const usedSeats = new Set(agentSeats.values())
    seatIndex = 1
    while (usedSeats.has(seatIndex) && seatIndex < SEAT_POSITIONS.length) seatIndex++
  }

  const seat = SEAT_POSITIONS[seatIndex] ?? SEAT_POSITIONS[SEAT_POSITIONS.length - 1] ?? { x: 1, y: 1 }

  const sprite = new AgentSprite(agentId, role, seat, app)
  sprite.setName(name)
  sprite.onPointerDown = (id) => {
    window.dispatchEvent(new CustomEvent('openclaw:agentclick', { detail: { agentId: id } }))
  }

  app.stage.addChild(sprite.container)
  agentSprites.set(agentId, sprite)
  agentSeats.set(agentId, seatIndex)
  updateConnections()
}

export function setAgentState(agentId: string, state: AgentState): void {
  agentSprites.get(agentId)?.setState(state)
}

export function removeAgentSprite(agentId: string): void {
  const s = agentSprites.get(agentId)
  if (s) { s.destroy(); agentSprites.delete(agentId); agentSeats.delete(agentId) }
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

  const fp = { x: from.container.x + 24, y: from.container.y + 24 }
  const tp = { x: to.container.x + 24,   y: to.container.y + 24 }

  animateTaskDelegation(app, fp, tp, () => {
    to.highlight()
    to.setState('working')
  })
}

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
