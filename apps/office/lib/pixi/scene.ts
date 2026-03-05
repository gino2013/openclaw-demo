import * as PIXI from 'pixi.js'
import { buildTilemap, SEAT_POSITIONS, TILE_SIZE } from './tilemap'
import { AgentSprite } from './agent-sprite'
import type { AgentState } from './agent-sprite'
import { animateTaskDelegation } from './mail-animation'
import type { AgentRole } from '@openclaw/core'

/** Tracks all live agent sprites keyed by agent ID */
const agentSprites = new Map<string, AgentSprite>()

/** Next available seat index */
let nextSeat = 0

/**
 * Initialise the full office scene.
 * Call once after the PIXI Application is created.
 *
 * @param app - The PIXI application instance
 */
export function initScene(app: PIXI.Application): void {
  const tilemapLayer = new PIXI.Container()
  buildTilemap(tilemapLayer, app)
  app.stage.addChild(tilemapLayer)
}

/**
 * Add a new agent sprite to the scene.
 *
 * @param app - The PIXI application
 * @param agentId - Unique agent ID
 * @param name - Display name
 * @param role - Agent role (determines sprite color)
 */
export function addAgentSprite(
  app: PIXI.Application,
  agentId: string,
  name: string,
  role: AgentRole
): void {
  if (agentSprites.has(agentId)) return

  const seatIndex = nextSeat % SEAT_POSITIONS.length
  nextSeat++
  const seat = SEAT_POSITIONS[seatIndex] ?? { x: 1, y: 1 }

  // Offset sprite to sit above the desk tile
  const position = { x: seat.x, y: seat.y - 1 }

  const sprite = new AgentSprite(agentId, role, position, app)
  sprite.setName(name)

  sprite.onPointerDown = (id) => {
    // Emit a custom event the React layer can listen to
    const event = new CustomEvent('openclaw:agentclick', { detail: { agentId: id } })
    window.dispatchEvent(event)
  }

  app.stage.addChild(sprite.container)
  agentSprites.set(agentId, sprite)
}

/**
 * Update an agent sprite's visual state.
 */
export function setAgentState(agentId: string, state: AgentState): void {
  agentSprites.get(agentId)?.setState(state)
}

/**
 * Remove an agent sprite from the scene.
 */
export function removeAgentSprite(agentId: string): void {
  const sprite = agentSprites.get(agentId)
  if (sprite) {
    sprite.destroy()
    agentSprites.delete(agentId)
  }
}

/**
 * Trigger the envelope delegation animation between two agents.
 *
 * @param app - The PIXI application
 * @param fromId - Source agent ID
 * @param toId - Destination agent ID
 */
export function triggerDelegationAnimation(
  app: PIXI.Application,
  fromId: string,
  toId: string
): void {
  const fromSprite = agentSprites.get(fromId)
  const toSprite = agentSprites.get(toId)
  if (!fromSprite || !toSprite) return

  const fromPos = {
    x: fromSprite.container.x + TILE_SIZE / 2,
    y: fromSprite.container.y + TILE_SIZE / 2,
  }
  const toPos = {
    x: toSprite.container.x + TILE_SIZE / 2,
    y: toSprite.container.y + TILE_SIZE / 2,
  }

  animateTaskDelegation(app, fromPos, toPos, () => {
    toSprite.highlight()
    toSprite.setState('working')
  })
}

/**
 * Play a celebration animation — all agents jump + confetti.
 *
 * @param app - The PIXI application
 */
export function playCelebration(app: PIXI.Application): void {
  const confettiColors = [0xe03030, 0xffe000, 0x3060e0, 0x30a030]
  const particles: PIXI.Graphics[] = []

  // Spawn confetti
  for (let i = 0; i < 30; i++) {
    const g = new PIXI.Graphics()
    g.rect(0, 0, 3, 3)
    g.fill(confettiColors[i % confettiColors.length] ?? 0xffffff)
    g.position.set(Math.random() * app.screen.width, 0)
    app.stage.addChild(g)
    particles.push(g)
  }

  // Make all agents jump
  for (const sprite of agentSprites.values()) {
    sprite.setState('success')
  }

  let frame = 0
  const DURATION = 120

  function celebrationTick(): void {
    frame++
    for (const p of particles) {
      p.y += 2 + Math.random() * 2
      p.x += (Math.random() - 0.5) * 2
      p.rotation += 0.1
    }

    if (frame >= DURATION) {
      app.ticker.remove(celebrationTick)
      for (const p of particles) {
        app.stage.removeChild(p)
        p.destroy()
      }
      // Return all agents to idle
      for (const sprite of agentSprites.values()) {
        sprite.setState('idle')
      }
    }
  }

  app.ticker.add(celebrationTick)
}
