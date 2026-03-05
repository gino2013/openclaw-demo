import * as PIXI from 'pixi.js'
import type { AgentRole } from '@openclaw/core'
import { TILE_SIZE } from './tilemap'
import { getSpriteTexture } from './preload-sprites'

export type AgentState = 'idle' | 'thinking' | 'working' | 'success' | 'error' | 'offline'

/** 96px matches PokeAPI source sprites exactly — zero upscale loss */
const SPRITE_SIZE = 96

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

    // ── Pokemon sprite (96×96 — exact source resolution) ────────────────
    const texture = getSpriteTexture(role)
    this.charSprite = new PIXI.Sprite(texture)
    this.charSprite.width = SPRITE_SIZE
    this.charSprite.height = SPRITE_SIZE
    this.container.addChild(this.charSprite)

    // ── State bubble above head ──────────────────────────────────────────
    this.bubble = new PIXI.Container()
    this.bubble.position.set(0, -48)
    this.container.addChild(this.bubble)

    // ── Name + status label below sprite ────────────────────────────────
    this.label = new PIXI.Container()
    this.label.position.set(-16, SPRITE_SIZE + 8)
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

  private txt(text: string, size: number, fill: number, pixel = false): PIXI.Text {
    return new PIXI.Text({
      text,
      style: new PIXI.TextStyle({
        fontFamily: pixel ? '"Press Start 2P", monospace' : 'monospace',
        fontSize: size,
        fill,
      }),
      resolution: 2,
    })
  }

  private refreshBubble(): void {
    this.bubble.removeChildren()
    const bg = new PIXI.Graphics()

    switch (this.currentState) {
      case 'thinking': {
        bg.roundRect(0, 0, 72, 40, 6); bg.fill(0xffffff); bg.stroke({ color: 0x101010, width: 2 })
        const t = this.txt('...', 20, 0x101010); t.position.set(8, 8)
        this.bubble.addChild(bg, t); break
      }
      case 'working': {
        bg.roundRect(0, 0, 80, 40, 6); bg.fill(0x203020); bg.stroke({ color: 0x00ff40, width: 2 })
        const t = this.txt('>>>', 20, 0x00ff40); t.position.set(8, 8)
        this.bubble.addChild(bg, t); break
      }
      case 'success': {
        bg.roundRect(0, 0, 64, 40, 6); bg.fill(0x302000); bg.stroke({ color: 0xffe000, width: 2 })
        const t = this.txt('★', 28, 0xffe000); t.position.set(12, 4)
        this.bubble.addChild(bg, t); break
      }
      case 'error': {
        bg.roundRect(0, 0, 64, 48, 6); bg.fill(0x300000); bg.stroke({ color: 0xff4040, width: 2 })
        const t = this.txt('?!', 24, 0xff4040); t.position.set(8, 8)
        this.bubble.addChild(bg, t); break
      }
      case 'offline': {
        bg.roundRect(0, 0, 80, 40, 6); bg.fill(0x202020); bg.stroke({ color: 0x808080, width: 2 })
        const t = this.txt('ZZZ', 20, 0x888888); t.position.set(8, 8)
        this.bubble.addChild(bg, t); break
      }
      default: break
    }
  }

  private refreshLabel(): void {
    this.label.removeChildren()

    const statusColor: Record<AgentState, number> = {
      idle: 0x88ffaa, thinking: 0x88aaff, working: 0x00ff88,
      success: 0xffe000, error: 0xff4040, offline: 0x666666,
    }
    const statusText: Record<AgentState, string> = {
      idle: 'IDLE', thinking: 'THINKING', working: 'WORKING',
      success: 'DONE', error: 'ERROR', offline: 'OFFLINE',
    }

    const name = (this.agentName || this.agentId).toUpperCase().slice(0, 10)
    const boxW = Math.max(name.length * 10 + 16, 120)

    const bg = new PIXI.Graphics()
    bg.roundRect(0, 0, boxW, 48, 4)
    bg.fill(0x101010)
    bg.stroke({ color: 0x404040, width: 2 })
    this.label.addChild(bg)

    const nameTxt = this.txt(name, 12, 0xffffff, true)
    nameTxt.position.set(8, 6)
    this.label.addChild(nameTxt)

    const statusTxt = this.txt(statusText[this.currentState], 10, statusColor[this.currentState], true)
    statusTxt.position.set(8, 26)
    this.label.addChild(statusTxt)
  }

  private onTick(): void {
    this.bobTick += 0.07
    this.blinkTick++

    switch (this.currentState) {
      case 'idle':
        this.container.y = this.baseY + Math.sin(this.bobTick) * 3
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
        this.container.y = this.baseY + Math.sin(this.bobTick * 5) * 2.5
        this.container.x = this.baseX + Math.sin(this.bobTick * 7) * 2
        break
      case 'success':
        this.container.y = this.baseY + Math.abs(Math.sin(this.bobTick * 4)) * -16
        this.container.x = this.baseX
        break
      case 'error':
        this.container.x = this.baseX + Math.sin(this.bobTick * 12) * 5
        this.container.y = this.baseY
        break
      case 'offline':
        this.container.y = this.baseY
        this.container.x = this.baseX
        break
    }
  }
}
