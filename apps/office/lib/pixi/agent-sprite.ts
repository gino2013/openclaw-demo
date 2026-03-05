import * as PIXI from 'pixi.js'
import type { AgentRole } from '@openclaw/core'
import { TILE_SIZE } from './tilemap'

export type AgentState = 'idle' | 'thinking' | 'working' | 'success' | 'error' | 'offline'

/** Role → body color mapping (Pokemon-inspired) */
const ROLE_COLORS: Record<AgentRole, number> = {
  orchestrator: 0xe03030,
  developer:    0x3060e0,
  reviewer:     0x30a030,
  analyst:      0xe0c000,
  custom:       0x9030c0,
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
  readonly container: PIXI.Container

  private body: PIXI.Graphics
  private bubble: PIXI.Container
  private nameTag: PIXI.Text
  private currentState: AgentState = 'idle'
  private bobTick = 0
  private blinkTick = 0
  private baseX: number
  private baseY: number

  private readonly color: number
  private readonly agentId: string

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
    this.baseX = position.x * TILE_SIZE
    this.baseY = position.y * TILE_SIZE
    this.container.position.set(this.baseX, this.baseY)
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    this.container.on('pointerdown', () => this.onPointerDown?.(this.agentId))

    // Body blob (16×14 px placeholder sprite)
    this.body = new PIXI.Graphics()
    this.redrawBody()
    this.container.addChild(this.body)

    // State bubble (above the sprite)
    this.bubble = new PIXI.Container()
    this.bubble.position.set(0, -12)
    this.container.addChild(this.bubble)

    // Name tag below
    this.nameTag = new PIXI.Text({
      text: agentId.slice(0, 6),
      style: new PIXI.TextStyle({
        fontFamily: 'monospace',
        fontSize: 5,
        fill: 0xffffff,
      }),
    })
    this.nameTag.position.set(0, 15)
    this.container.addChild(this.nameTag)

    this.app.ticker.add(this.onTick, this)
  }

  setState(state: AgentState): void {
    this.currentState = state
    this.refreshBubble()
  }

  setName(name: string): void {
    this.nameTag.text = name.slice(0, 8)
  }

  highlight(): void {
    this.body.tint = 0xffffff
    setTimeout(() => { this.body.tint = 0xffffff }, 200)
  }

  destroy(): void {
    this.app.ticker.remove(this.onTick, this)
    this.container.destroy({ children: true })
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private redrawBody(): void {
    this.body.clear()
    const c = this.color
    const dark = this.darken(c, 0.65)
    // Head
    this.body.roundRect(3, 0, 10, 10, 3)
    this.body.fill(c)
    // Body
    this.body.roundRect(2, 8, 12, 6, 2)
    this.body.fill(dark)
    // Eyes
    this.body.rect(5, 3, 2, 2)
    this.body.fill(0xffffff)
    this.body.rect(9, 3, 2, 2)
    this.body.fill(0xffffff)
    this.body.rect(6, 4, 1, 1)
    this.body.fill(0x101010)
    this.body.rect(10, 4, 1, 1)
    this.body.fill(0x101010)
    // Outline
    this.body.roundRect(3, 0, 10, 10, 3)
    this.body.stroke({ color: 0x101010, width: 1 })
    this.body.roundRect(2, 8, 12, 6, 2)
    this.body.stroke({ color: 0x101010, width: 1 })
  }

  private refreshBubble(): void {
    this.bubble.removeChildren()

    switch (this.currentState) {
      case 'thinking': {
        const g = new PIXI.Graphics()
        g.roundRect(0, 0, 14, 8, 2)
        g.fill(0xffffff)
        g.stroke({ color: 0x101010, width: 1 })
        const t = new PIXI.Text({ text: '...', style: new PIXI.TextStyle({ fontSize: 5, fill: 0x101010, fontFamily: 'monospace' }) })
        t.position.set(2, 1)
        this.bubble.addChild(g, t)
        break
      }
      case 'working': {
        const g = new PIXI.Graphics()
        g.roundRect(0, 0, 14, 8, 2)
        g.fill(0x30c030)
        g.stroke({ color: 0x101010, width: 1 })
        const t = new PIXI.Text({ text: '>>>', style: new PIXI.TextStyle({ fontSize: 5, fill: 0xffffff, fontFamily: 'monospace' }) })
        t.position.set(1, 1)
        this.bubble.addChild(g, t)
        break
      }
      case 'success': {
        const g = new PIXI.Graphics()
        // Draw a simple star shape manually
        g.rect(4, 0, 4, 10)
        g.fill(0xffe000)
        g.rect(0, 3, 12, 4)
        g.fill(0xffe000)
        g.stroke({ color: 0x101010, width: 1 })
        this.bubble.addChild(g)
        break
      }
      case 'error': {
        const g = new PIXI.Graphics()
        g.roundRect(0, 0, 10, 10, 2)
        g.fill(0xff4040)
        g.stroke({ color: 0x101010, width: 1 })
        const t = new PIXI.Text({ text: '!', style: new PIXI.TextStyle({ fontSize: 8, fill: 0xffffff, fontFamily: 'monospace', fontWeight: 'bold' }) })
        t.position.set(3, 0)
        this.bubble.addChild(g, t)
        break
      }
      case 'offline': {
        const g = new PIXI.Graphics()
        g.roundRect(0, 0, 16, 8, 2)
        g.fill(0x808080)
        g.stroke({ color: 0x505050, width: 1 })
        const t = new PIXI.Text({ text: 'ZZZ', style: new PIXI.TextStyle({ fontSize: 5, fill: 0xdddddd, fontFamily: 'monospace' }) })
        t.position.set(1, 1)
        this.bubble.addChild(g, t)
        break
      }
      default:
        break
    }
  }

  private onTick(): void {
    this.bobTick += 0.06
    this.blinkTick++

    switch (this.currentState) {
      case 'idle':
        // Gentle bob
        this.container.y = this.baseY + Math.sin(this.bobTick) * 0.8
        this.body.tint = 0xffffff
        break

      case 'thinking':
        this.container.y = this.baseY
        if (this.blinkTick % 20 === 0) {
          this.bubble.alpha = this.bubble.alpha > 0.5 ? 0.2 : 1.0
        }
        break

      case 'working':
        // Fast bob
        this.container.y = this.baseY + Math.sin(this.bobTick * 4) * 1.2
        this.container.x = this.baseX + Math.sin(this.bobTick * 6) * 0.5
        break

      case 'success':
        // Jump
        this.container.y = this.baseY + Math.sin(this.bobTick * 3) * 3
        this.container.x = this.baseX
        break

      case 'error':
        // Shake
        this.container.x = this.baseX + Math.sin(this.bobTick * 10) * 1.5
        this.container.y = this.baseY
        break

      case 'offline':
        this.container.y = this.baseY
        this.container.x = this.baseX
        this.body.tint = 0x888888
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
