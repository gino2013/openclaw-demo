import * as PIXI from 'pixi.js'
import type { AgentRole } from '@openclaw/core'
import { TILE_SIZE } from './tilemap'
import { getSpriteTexture } from './preload-sprites'

export type AgentState = 'idle' | 'thinking' | 'working' | 'success' | 'error' | 'offline'

/** Size of the Pokemon sprite in native canvas pixels */
const SPRITE_SIZE = 24

export class AgentSprite {
  readonly container: PIXI.Container

  private charSprite: PIXI.Sprite
  private bubble: PIXI.Container
  private label: PIXI.Container

  private currentState: AgentState = 'idle'
  private bobTick = 0
  private blinkTick = 0
  private baseX: number
  private baseY: number

  private readonly role: AgentRole
  private readonly agentId: string
  private agentName = ''

  onPointerDown?: (agentId: string) => void

  constructor(
    agentId: string,
    role: AgentRole,
    position: { x: number; y: number },
    private readonly app: PIXI.Application
  ) {
    this.agentId = agentId
    this.role = role
    this.baseX = position.x * TILE_SIZE - SPRITE_SIZE / 2 + TILE_SIZE / 2
    this.baseY = position.y * TILE_SIZE - SPRITE_SIZE + TILE_SIZE / 2

    this.container = new PIXI.Container()
    this.container.position.set(this.baseX, this.baseY)
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    this.container.on('pointerdown', () => this.onPointerDown?.(agentId))

    // ── Pokemon sprite ───────────────────────────────────────────────────
    const texture = getSpriteTexture(role)
    this.charSprite = new PIXI.Sprite(texture)
    this.charSprite.width = SPRITE_SIZE
    this.charSprite.height = SPRITE_SIZE
    this.container.addChild(this.charSprite)

    // ── State bubble above head ──────────────────────────────────────────
    this.bubble = new PIXI.Container()
    this.bubble.position.set(0, -12)
    this.container.addChild(this.bubble)

    // ── Name + status label box below sprite ─────────────────────────────
    this.label = new PIXI.Container()
    this.label.position.set(-4, SPRITE_SIZE + 2)
    this.container.addChild(this.label)

    this.refreshBubble()
    this.refreshLabel()

    this.app.ticker.add(this.onTick, this)
  }

  setState(state: AgentState): void {
    if (this.currentState === state) return
    this.currentState = state
    this.charSprite.tint = state === 'offline' ? 0x888888 : 0xffffff
    this.refreshBubble()
    this.refreshLabel()
  }

  setName(name: string): void {
    this.agentName = name
    this.refreshLabel()
  }

  highlight(): void {
    this.charSprite.tint = 0xffff00
    setTimeout(() => { this.charSprite.tint = 0xffffff }, 300)
  }

  destroy(): void {
    this.app.ticker.remove(this.onTick, this)
    this.container.destroy({ children: true })
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private refreshBubble(): void {
    this.bubble.removeChildren()
    const bg = new PIXI.Graphics()

    switch (this.currentState) {
      case 'thinking': {
        bg.roundRect(0, 0, 18, 10, 2); bg.fill(0xffffff); bg.stroke({ color: 0x101010, width: 1 })
        const t = new PIXI.Text({ text: '...', style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 5, fill: 0x101010 }) })
        t.position.set(2, 2); this.bubble.addChild(bg, t)
        break
      }
      case 'working': {
        bg.roundRect(0, 0, 20, 10, 2); bg.fill(0x203020); bg.stroke({ color: 0x00ff40, width: 1 })
        const t = new PIXI.Text({ text: '>>>', style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 5, fill: 0x00ff40 }) })
        t.position.set(2, 2); this.bubble.addChild(bg, t)
        break
      }
      case 'success': {
        bg.roundRect(0, 0, 16, 10, 2); bg.fill(0x302000); bg.stroke({ color: 0xffe000, width: 1 })
        const t = new PIXI.Text({ text: '★', style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0xffe000 }) })
        t.position.set(3, 1); this.bubble.addChild(bg, t)
        break
      }
      case 'error': {
        bg.roundRect(0, 0, 16, 12, 2); bg.fill(0x300000); bg.stroke({ color: 0xff4040, width: 1 })
        const t = new PIXI.Text({ text: '?!', style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 6, fill: 0xff4040 }) })
        t.position.set(2, 2); this.bubble.addChild(bg, t)
        break
      }
      case 'offline': {
        bg.roundRect(0, 0, 20, 10, 2); bg.fill(0x202020); bg.stroke({ color: 0x808080, width: 1 })
        const t = new PIXI.Text({ text: 'ZZZ', style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 5, fill: 0x888888 }) })
        t.position.set(2, 2); this.bubble.addChild(bg, t)
        break
      }
      default:
        break
    }
  }

  private refreshLabel(): void {
    this.label.removeChildren()

    const statusColor: Record<AgentState, number> = {
      idle: 0x88ffaa, thinking: 0x88aaff, working: 0x00ff88,
      success: 0xffe000, error: 0xff4040, offline: 0x666666,
    }
    const statusText: Record<AgentState, string> = {
      idle: 'idle', thinking: 'thinking', working: 'working',
      success: 'success', error: 'error', offline: 'offline',
    }

    const name = (this.agentName || this.agentId).toUpperCase().slice(0, 10)
    const boxW = Math.max(name.length * 5, 50) + 6

    const bg = new PIXI.Graphics()
    bg.roundRect(0, 0, boxW, 18, 1)
    bg.fill(0x101010)
    bg.stroke({ color: 0x404040, width: 1 })
    this.label.addChild(bg)

    const nameTxt = new PIXI.Text({
      text: name,
      style: new PIXI.TextStyle({ fontFamily: '"Press Start 2P", monospace', fontSize: 4, fill: 0xffffff }),
    })
    nameTxt.position.set(3, 2)
    this.label.addChild(nameTxt)

    const statusTxt = new PIXI.Text({
      text: statusText[this.currentState],
      style: new PIXI.TextStyle({ fontFamily: '"Press Start 2P", monospace', fontSize: 4, fill: statusColor[this.currentState] }),
    })
    statusTxt.position.set(3, 9)
    this.label.addChild(statusTxt)
  }

  private onTick(): void {
    this.bobTick += 0.07
    this.blinkTick++

    switch (this.currentState) {
      case 'idle':
        this.container.y = this.baseY + Math.sin(this.bobTick) * 1.2
        this.container.x = this.baseX
        break
      case 'thinking':
        this.container.y = this.baseY
        this.container.x = this.baseX
        if (this.blinkTick % 25 === 0) {
          this.bubble.alpha = this.bubble.alpha > 0.5 ? 0.2 : 1.0
        }
        break
      case 'working':
        this.container.y = this.baseY + Math.sin(this.bobTick * 5) * 0.8
        this.container.x = this.baseX + Math.sin(this.bobTick * 7) * 0.6
        break
      case 'success':
        this.container.y = this.baseY + Math.abs(Math.sin(this.bobTick * 4)) * -6
        this.container.x = this.baseX
        break
      case 'error':
        this.container.x = this.baseX + Math.sin(this.bobTick * 12) * 2
        this.container.y = this.baseY
        break
      case 'offline':
        this.container.y = this.baseY
        this.container.x = this.baseX
        break
    }
  }
}
