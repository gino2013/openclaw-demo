import * as PIXI from 'pixi.js'
import type { AgentRole } from '@openclaw/core'
import { TILE_SIZE } from './tilemap'
import { getCharPixels, drawPixelChar } from './pixel-chars'

export type AgentState = 'idle' | 'thinking' | 'working' | 'success' | 'error' | 'offline'

/** Pixel size for character rendering (2 = each "pixel" is 2×2 canvas units) */
const PX = 2
/** Character render width/height in canvas units (16px × PX) */
const CHAR_W = 16 * PX  // 32
const CHAR_H = 20 * PX  // 40 (includes tail/feet rows)

/**
 * Manages a single agent's Pokemon-inspired pixel-art sprite.
 * // TODO: replace with actual pixel art spritesheets
 */
export class AgentSprite {
  readonly container: PIXI.Container

  private charGfx: PIXI.Graphics    // pixel art body
  private bubble: PIXI.Container    // state bubble above head
  private nameTag: PIXI.Text
  private label: PIXI.Container     // name + status label box (like the reference image)

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
    this.baseX = position.x * TILE_SIZE - CHAR_W / 2 + TILE_SIZE / 2
    this.baseY = position.y * TILE_SIZE - CHAR_H + TILE_SIZE / 2

    this.container = new PIXI.Container()
    this.container.position.set(this.baseX, this.baseY)
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    this.container.on('pointerdown', () => this.onPointerDown?.(agentId))

    // ── Pixel art character ──────────────────────────────────────────────
    this.charGfx = new PIXI.Graphics()
    this.redrawChar()
    this.container.addChild(this.charGfx)

    // ── Bubble (above head) ──────────────────────────────────────────────
    this.bubble = new PIXI.Container()
    this.bubble.position.set(CHAR_W / 2 - 8, -14)
    this.container.addChild(this.bubble)

    // ── Name label box (like reference image: black box, colored text) ───
    this.label = new PIXI.Container()
    this.label.position.set(-6, CHAR_H + 1)
    this.container.addChild(this.label)

    this.nameTag = new PIXI.Text({
      text: agentId.slice(0, 8),
      style: new PIXI.TextStyle({
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 4,
        fill: 0x00ff88,
      }),
    })
    this.nameTag.position.set(2, 2)
    this.label.addChild(this.nameTag)

    this.app.ticker.add(this.onTick, this)
  }

  setState(state: AgentState): void {
    if (this.currentState === state) return
    this.currentState = state
    this.redrawChar()
    this.refreshBubble()
    this.refreshLabel()
  }

  setName(name: string): void {
    this.agentName = name
    this.nameTag.text = name.toUpperCase().slice(0, 10)
    this.refreshLabel()
  }

  highlight(): void {
    this.charGfx.tint = 0xffffff
    setTimeout(() => { this.charGfx.tint = 0xffffff }, 300)
  }

  destroy(): void {
    this.app.ticker.remove(this.onTick, this)
    this.container.destroy({ children: true })
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private redrawChar(): void {
    this.charGfx.clear()
    const pixels = getCharPixels(this.role)

    if (this.currentState === 'offline') {
      // Greyscale tint
      this.charGfx.tint = 0x888888
    } else {
      this.charGfx.tint = 0xffffff
    }

    drawPixelChar(this.charGfx, pixels, PX)
  }

  private refreshBubble(): void {
    this.bubble.removeChildren()

    const bg = new PIXI.Graphics()
    const txt = new PIXI.Text({
      text: '',
      style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 5, fill: 0x101010 }),
    })

    switch (this.currentState) {
      case 'thinking': {
        bg.roundRect(0, 0, 18, 10, 2)
        bg.fill(0xffffff)
        bg.stroke({ color: 0x101010, width: 1 })
        txt.text = '...'
        txt.position.set(2, 2)
        this.bubble.addChild(bg, txt)
        break
      }
      case 'working': {
        // ">>>" green box like reference
        bg.roundRect(0, 0, 20, 10, 2)
        bg.fill(0x203020)
        bg.stroke({ color: 0x00ff40, width: 1 })
        const wt = new PIXI.Text({ text: '>>>', style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 5, fill: 0x00ff40 }) })
        wt.position.set(2, 2)
        this.bubble.addChild(bg, wt)
        break
      }
      case 'success': {
        // Gold star box
        bg.roundRect(0, 0, 16, 10, 2)
        bg.fill(0x302000)
        bg.stroke({ color: 0xffe000, width: 1 })
        const st = new PIXI.Text({ text: '★', style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0xffe000 }) })
        st.position.set(3, 1)
        this.bubble.addChild(bg, st)
        break
      }
      case 'error': {
        // Red "?" box
        bg.roundRect(0, 0, 16, 12, 2)
        bg.fill(0x300000)
        bg.stroke({ color: 0xff4040, width: 1 })
        const et = new PIXI.Text({ text: '?!', style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 6, fill: 0xff4040 }) })
        et.position.set(2, 2)
        this.bubble.addChild(bg, et)
        break
      }
      case 'offline': {
        // "ZZZ" grey box
        bg.roundRect(0, 0, 20, 10, 2)
        bg.fill(0x202020)
        bg.stroke({ color: 0x808080, width: 1 })
        const zt = new PIXI.Text({ text: 'ZZZ', style: new PIXI.TextStyle({ fontFamily: 'monospace', fontSize: 5, fill: 0x888888 }) })
        zt.position.set(2, 2)
        this.bubble.addChild(bg, zt)
        break
      }
      default:
        break
    }
  }

  private refreshLabel(): void {
    this.label.removeChildren()

    const statusColor: Record<AgentState, number> = {
      idle:     0x88ffaa,
      thinking: 0x88aaff,
      working:  0x00ff88,
      success:  0xffe000,
      error:    0xff4040,
      offline:  0x666666,
    }
    const statusText: Record<AgentState, string> = {
      idle:     'idle',
      thinking: 'thinking',
      working:  'working',
      success:  'success',
      error:    'error',
      offline:  'offline',
    }

    // Measure text width
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
        // Gentle breathing bob
        this.container.y = this.baseY + Math.sin(this.bobTick) * 1.2
        this.container.x = this.baseX
        break

      case 'thinking':
        this.container.y = this.baseY
        this.container.x = this.baseX
        // Blink bubble dots
        if (this.blinkTick % 25 === 0) {
          this.bubble.alpha = this.bubble.alpha > 0.5 ? 0.2 : 1.0
        }
        break

      case 'working':
        // Typing shake
        this.container.y = this.baseY + Math.sin(this.bobTick * 5) * 0.8
        this.container.x = this.baseX + Math.sin(this.bobTick * 7) * 0.6
        break

      case 'success':
        // Jump!
        this.container.y = this.baseY + Math.abs(Math.sin(this.bobTick * 4)) * -6
        this.container.x = this.baseX
        break

      case 'error':
        // Head shake
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
