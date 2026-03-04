import * as PIXI from 'pixi.js'
import type { AgentRole } from '@openclaw/core'
import { TILE_SIZE } from './tilemap'

export type AgentState = 'idle' | 'thinking' | 'working' | 'success' | 'error' | 'offline'

/** Role → body color mapping (Pokemon-inspired) */
const ROLE_COLORS: Record<AgentRole, number> = {
  orchestrator: 0xe03030,  // red (Charmander)
  developer:    0x3060e0,  // blue (Squirtle)
  reviewer:     0x30a030,  // green (Bulbasaur)
  analyst:      0xe0c000,  // yellow (Pikachu)
  custom:       0x9030c0,  // purple
}

export interface AgentDialogContent {
  agentId: string
  name: string
  role: string
  currentTask?: string
  recentTasks: string[]
}

/**
 * Manages a single agent's Pixi.js sprite with state-based animation.
 * // TODO: replace placeholder graphics with actual pixel art sprites
 */
export class AgentSprite {
  /** Root container — position this to move the agent */
  readonly container: PIXI.Container

  private body: PIXI.Graphics
  private eye: PIXI.Graphics
  private bubble: PIXI.Container
  private nameTag: PIXI.Text
  private currentState: AgentState = 'idle'
  private bobTick = 0
  private blinkTick = 0

  private readonly color: number
  private readonly agentId: string

  /** Called when the user clicks this sprite */
  onPointerDown?: (agentId: string) => void

  constructor(
    agentId: string,
    role: AgentRole,
    position: { x: number; y: number },
    private readonly app: PIXI.Application
  ) {
    this.agentId = agentId
    this.color = ROLE_COLORS[role] ?? ROLE_COLORS.custom

    this.container = new PIXI.Container()
    this.container.position.set(position.x * TILE_SIZE, position.y * TILE_SIZE)
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    this.container.on('pointerdown', () => this.onPointerDown?.(this.agentId))

    // --- Build placeholder sprite (16×16 px blob) ---
    this.body = new PIXI.Graphics()
    this.drawBody(1.0)
    this.container.addChild(this.body)

    // Eye
    this.eye = new PIXI.Graphics()
    this.eye.ellipse(5, 5, 2, 2).fill(0xffffff)
    this.eye.ellipse(5, 5, 1, 1).fill(0x101010)
    this.container.addChild(this.eye)

    // State bubble (above the sprite)
    this.bubble = new PIXI.Container()
    this.bubble.position.set(0, -10)
    this.container.addChild(this.bubble)

    // Name tag
    this.nameTag = new PIXI.Text({
      text: agentId.slice(0, 6),
      style: {
        fontFamily: '"Press Start 2P"',
        fontSize: 4,
        fill: 0xffffff,
      },
    })
    this.nameTag.position.set(-4, 17)
    this.container.addChild(this.nameTag)

    // Start idle animation loop
    this.app.ticker.add(this.tick.bind(this))
  }

  /**
   * Switch the agent to a new visual state.
   * Triggers corresponding animation and bubble change.
   */
  setState(state: AgentState): void {
    this.currentState = state
    this.updateBubble()
  }

  /**
   * Update the name tag display text.
   */
  setName(name: string): void {
    this.nameTag.text = name.slice(0, 8)
  }

  /**
   * Flash the sprite white briefly (task arrival effect).
   */
  highlight(): void {
    this.body.tint = 0xffffff
    setTimeout(() => {
      this.body.tint = 0xffffff  // reset handled in tick
    }, 200)
  }

  /** Remove this sprite from the scene and clean up. */
  destroy(): void {
    this.app.ticker.remove(this.tick.bind(this))
    this.container.destroy({ children: true })
  }

  private drawBody(scaleY: number): void {
    this.body.clear()
    const h = Math.round(12 * scaleY)
    const offset = 12 - h
    // Main body blob
    this.body.roundRect(2, offset, 12, h, 4).fill(this.color)
    // Darker bottom half
    this.body.roundRect(2, offset + Math.floor(h / 2), 12, Math.ceil(h / 2), 4).fill(
      this.darken(this.color, 0.7)
    )
    // Outline
    this.body.roundRect(2, offset, 12, h, 4).stroke({ color: 0x101010, width: 1 })
  }

  private updateBubble(): void {
    this.bubble.removeChildren()
    const g = new PIXI.Graphics()

    switch (this.currentState) {
      case 'thinking': {
        // "..." speech bubble
        g.roundRect(0, 0, 12, 8, 2).fill(0xffffff).stroke({ color: 0x101010, width: 1 })
        const dots = new PIXI.Text({ text: '...', style: { fontSize: 4, fill: 0x101010 } })
        dots.position.set(1, 1)
        this.bubble.addChild(g, dots)
        break
      }
      case 'working': {
        // Keyboard icon
        g.roundRect(0, 0, 12, 8, 1).fill(0x30c030).stroke({ color: 0x101010, width: 1 })
        const kb = new PIXI.Text({ text: '>>>', style: { fontSize: 4, fill: 0x101010 } })
        kb.position.set(1, 1)
        this.bubble.addChild(g, kb)
        break
      }
      case 'success': {
        // Star
        g.star(6, 4, 5, 5, 2).fill(0xffe000).stroke({ color: 0x101010, width: 1 })
        this.bubble.addChild(g)
        break
      }
      case 'error': {
        // "?" bubble
        g.roundRect(0, 0, 10, 8, 2).fill(0xff4040).stroke({ color: 0x101010, width: 1 })
        const q = new PIXI.Text({ text: '?', style: { fontSize: 6, fill: 0xffffff } })
        q.position.set(2, 0)
        this.bubble.addChild(g, q)
        break
      }
      case 'offline': {
        // ZZZ
        g.roundRect(0, 0, 14, 8, 2).fill(0x808080).stroke({ color: 0x101010, width: 1 })
        const z = new PIXI.Text({ text: 'ZZZ', style: { fontSize: 4, fill: 0x404040 } })
        z.position.set(1, 1)
        this.bubble.addChild(g, z)
        break
      }
      case 'idle':
      default:
        // No bubble
        break
    }
  }

  private tick(): void {
    this.bobTick += 0.05
    this.blinkTick += 1

    switch (this.currentState) {
      case 'idle':
        // Gentle bob up/down
        this.container.y += Math.sin(this.bobTick) * 0.2
        this.body.tint = 0xffffff
        break

      case 'thinking':
        // Slow pulse
        this.body.alpha = 0.8 + Math.sin(this.bobTick * 0.5) * 0.2
        // Blink bubble dots
        if (this.blinkTick % 30 === 0) {
          this.bubble.alpha = this.bubble.alpha > 0.5 ? 0.2 : 1.0
        }
        break

      case 'working':
        // Quick shake
        this.container.x += (Math.random() - 0.5) * 0.5
        break

      case 'success':
        // Jump
        this.container.y += Math.sin(this.bobTick * 3) * 0.5
        break

      case 'error':
        // Shake head (horizontal)
        this.container.x += Math.sin(this.bobTick * 8) * 0.4
        break

      case 'offline':
        this.body.tint = 0xaaaaaa
        break
    }
  }

  private darken(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor)
    const g = Math.floor(((color >> 8) & 0xff) * factor)
    const b = Math.floor((color & 0xff) * factor)
    return (r << 16) | (g << 8) | b
  }
}
