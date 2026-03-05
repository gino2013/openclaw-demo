import * as PIXI from 'pixi.js'
import type { AgentRole } from '@openclaw/core'
import { TILE_SIZE } from './tilemap'
import { getSpriteTexture } from './preload-sprites'

export type AgentState = 'idle' | 'thinking' | 'working' | 'success' | 'error' | 'offline'

/** Pokemon sprite display size in canvas pixels (matches 96px source at ~2:1 ratio) */
const SPRITE_SIZE = 48

/** Text resolution multiplier — keeps labels crisp when canvas is CSS-scaled */
const TEXT_RES = 2

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
    this.bubble.position.set(0, -24)
    this.container.addChild(this.bubble)

    // ── Name + status label box below sprite ─────────────────────────────
    this.label = new PIXI.Container()
    this.label.position.set(-8, SPRITE_SIZE + 4)
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

  private makeText(text: string, fontSize: number, fill: number): PIXI.Text {
    return new PIXI.Text({
      text,
      style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize, fill }),
      resolution: TEXT_RES,
    })
  }

  private makePixelText(text: string, fontSize: number, fill: number): PIXI.Text {
    return new PIXI.Text({
      text,
      style: new PIXI.TextStyle({ fontFamily: '"Press Start 2P", monospace', fontSize, fill }),
      resolution: TEXT_RES,
    })
  }

  private refreshBubble(): void {
    this.bubble.removeChildren()
    const bg = new PIXI.Graphics()

    switch (this.currentState) {
      case 'thinking': {
        bg.roundRect(0, 0, 36, 20, 3); bg.fill(0xffffff); bg.stroke({ color: 0x101010, width: 1 })
        const t = this.makeText('...', 10, 0x101010); t.position.set(4, 4)
        this.bubble.addChild(bg, t)
        break
      }
      case 'working': {
        bg.roundRect(0, 0, 40, 20, 3); bg.fill(0x203020); bg.stroke({ color: 0x00ff40, width: 1 })
        const t = this.makeText('>>>', 10, 0x00ff40); t.position.set(4, 4)
        this.bubble.addChild(bg, t)
        break
      }
      case 'success': {
        bg.roundRect(0, 0, 32, 20, 3); bg.fill(0x302000); bg.stroke({ color: 0xffe000, width: 1 })
        const t = this.makeText('★', 14, 0xffe000); t.position.set(6, 2)
        this.bubble.addChild(bg, t)
        break
      }
      case 'error': {
        bg.roundRect(0, 0, 32, 24, 3); bg.fill(0x300000); bg.stroke({ color: 0xff4040, width: 1 })
        const t = this.makeText('?!', 12, 0xff4040); t.position.set(4, 4)
        this.bubble.addChild(bg, t)
        break
      }
      case 'offline': {
        bg.roundRect(0, 0, 40, 20, 3); bg.fill(0x202020); bg.stroke({ color: 0x808080, width: 1 })
        const t = this.makeText('ZZZ', 10, 0x888888); t.position.set(4, 4)
        this.bubble.addChild(bg, t)
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
      success: 'done', error: 'error', offline: 'offline',
    }

    const name = (this.agentName || this.agentId).toUpperCase().slice(0, 10)
    const boxW = Math.max(name.length * 8 + 8, 80)

    const bg = new PIXI.Graphics()
    bg.roundRect(0, 0, boxW, 28, 2)
    bg.fill(0x101010)
    bg.stroke({ color: 0x404040, width: 1 })
    this.label.addChild(bg)

    const nameTxt = this.makePixelText(name, 6, 0xffffff)
    nameTxt.position.set(4, 3)
    this.label.addChild(nameTxt)

    const statusTxt = this.makePixelText(statusText[this.currentState], 6, statusColor[this.currentState])
    statusTxt.position.set(4, 14)
    this.label.addChild(statusTxt)
  }

  private onTick(): void {
    this.bobTick += 0.07
    this.blinkTick++

    switch (this.currentState) {
      case 'idle':
        this.container.y = this.baseY + Math.sin(this.bobTick) * 2
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
        this.container.y = this.baseY + Math.sin(this.bobTick * 5) * 1.5
        this.container.x = this.baseX + Math.sin(this.bobTick * 7) * 1.2
        break
      case 'success':
        this.container.y = this.baseY + Math.abs(Math.sin(this.bobTick * 4)) * -10
        this.container.x = this.baseX
        break
      case 'error':
        this.container.x = this.baseX + Math.sin(this.bobTick * 12) * 3
        this.container.y = this.baseY
        break
      case 'offline':
        this.container.y = this.baseY
        this.container.x = this.baseX
        break
    }
  }
}
