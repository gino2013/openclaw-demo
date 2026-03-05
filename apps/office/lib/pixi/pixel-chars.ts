/**
 * Pixel-art character definitions for OpenClaw agents.
 * Each character is a 16×20 grid; each cell is an RGBA hex color (0 = transparent).
 * Rendered at pixelSize=2 → 32×40 px on screen.
 */

/** Decode a string-based pixel map into color arrays.
 *  Each char maps to a palette color; '.' = transparent.
 */
function decode(rows: string[], palette: Record<string, number>): number[][] {
  return rows.map((row) =>
    [...row].map((ch) => (ch === '.' ? 0 : (palette[ch] ?? 0)))
  )
}

// ── Charmander (Orchestrator — red/orange) ─────────────────────────────────
const CHA_PAL: Record<string, number> = {
  O: 0xe25c00, // main orange
  L: 0xf8a060, // light orange / highlight
  Y: 0xf0e060, // yellow belly
  K: 0x101010, // outline / pupil
  W: 0xffffff, // eye white
  B: 0x4090e0, // blue iris
  F: 0xff7820, // flame orange
  G: 0xffe020, // flame yellow
  T: 0xd04000, // dark tail
}
export const CHARMANDER = decode([
  '....KOOOOK......',
  '...KOLLLLOK.....',
  '..KOLLLLLLLOK...',
  '..KOLWBKLWBKOK..',
  '..KOLLLLLLLOK...',
  '..KOLLLYLLOK....',
  '...KOKKKKOK.....',
  '..KOOOOOOOOOK...',
  '.KOOLYYYLOOOK...',
  '.KOOLYYYLOOOK...',
  '..KOOOOOOOOK....',
  '...KKOOKKOK.....',
  '....KOOK.KTK....',
  '....KOOK..KTK...',
  '.......K...KFFK.',
  '...........KGGK.',
], CHA_PAL)

// ── Squirtle (Developer — blue) ────────────────────────────────────────────
const SQU_PAL: Record<string, number> = {
  B: 0x3070e0, // main blue
  L: 0x70b0ff, // light blue
  S: 0x805030, // shell brown
  E: 0xa07040, // shell edge
  W: 0xffffff, // eye white
  K: 0x101010, // outline
  Y: 0xf0f0a0, // belly yellow
  T: 0x2050a0, // dark blue
}
export const SQUIRTLE = decode([
  '....KBBBBBK.....',
  '...KBLLLLLLK....',
  '..KBLLLLLLLLK...',
  '..KBLWKKLWKBK...',
  '..KBLLLLLLLBK...',
  '..KBLLYYLLBK....',
  '...KKKKYKKK.....',
  '.KKSEEEEEESKK...',
  'KSBEEYYYYEEBSK..',
  'KSBEYYYYYEEBSK..',
  'KSBEEYYYYEEBSK..',
  '.KKSEEEEEESKK...',
  '...KBBYBBBK.....',
  '...KBKK.KBK.....',
  '...KBKK.KBK.....',
  '...KTKK.KTK.....',
], SQU_PAL)

// ── Bulbasaur (Reviewer — green) ───────────────────────────────────────────
const BUL_PAL: Record<string, number> = {
  G: 0x50b060, // main green
  L: 0x90e090, // light green
  D: 0x307040, // dark green
  S: 0x60c870, // seed/bulb
  K: 0x101010, // outline
  W: 0xffffff, // eye white
  R: 0xe03030, // red iris
  P: 0xd080c0, // bulb purple spots
  B: 0x6080a0, // underbelly blue-grey
}
export const BULBASAUR = decode([
  '...KSSSK........',
  '..KSPPSPK.......',
  '.KSSPPPSPK......',
  'KGGGGGGGGGK.....',
  'KGLWRLWRGGK.....',
  'KGGGGGGGGGK.....',
  'KGBBBBBGGGK.....',
  '.KGGGGGGGK......',
  '.KGGBBBGGK......',
  '..KGGGGGK.......',
  '..KDKKKDK.......',
  '..KGK.KGK.......',
  '..KGK.KGK.......',
  '..KDK.KDK.......',
  '................',
  '................',
], BUL_PAL)

// ── Pikachu (Analyst — yellow) ─────────────────────────────────────────────
const PIK_PAL: Record<string, number> = {
  Y: 0xf8d000, // main yellow
  L: 0xfff060, // highlight yellow
  K: 0x101010, // outline / ear tip
  W: 0xffffff, // eye white
  R: 0xe03030, // cheek red
  B: 0x101040, // eye black
  T: 0x806020, // paw brown
}
export const PIKACHU = decode([
  '...KKK...KKK....',
  '..KYYK...KYYK...',
  '.KYYY K.K YYYK..',
  '.KYYYYYK YYYYK..',
  '..KYYYYYYYYYYYK.',
  '..KYLYYYYYYYYK..',
  '..KYLWBKYYWBYK..',
  '..KYYYRKYYRK....',
  '..KYYYYYYYYYK...',
  '..KYYLYYYYYK....',
  '..KYYYYYYYYYK...',
  '...KKYYYYYK.....',
  '...KYYK.KYYK....',
  '...KYYK.KYYK....',
  '...KTTK.KTTK....',
  '................',
], PIK_PAL)

// ── Generic blob (Custom — purple) ─────────────────────────────────────────
const GEN_PAL: Record<string, number> = {
  P: 0x8040c0,
  L: 0xb080f0,
  K: 0x101010,
  W: 0xffffff,
  D: 0x5020a0,
}
export const GENERIC = decode([
  '....KPPPPPK.....',
  '...KPLLLLPPK....',
  '..KPLLLLLLPPK...',
  '..KPLWKKLWKPK...',
  '..KPLLLLLLPPK...',
  '..KPLLPLLPPK....',
  '...KKKPKKK......',
  '..KPPPPPPPK.....',
  '.KPPPPPPPPPPK...',
  '.KPPPPPPPPPPK...',
  '..KPPPPPPPPK....',
  '...KPPKKKPK.....',
  '...KDPK.KPDK....',
  '...KDPK.KPDK....',
  '...KKKK.KKKK....',
  '................',
], GEN_PAL)

import type { AgentRole } from '@openclaw/core'

/** Returns the pixel art array for a given agent role */
export function getCharPixels(role: AgentRole): number[][] {
  switch (role) {
    case 'orchestrator': return CHARMANDER
    case 'developer':    return SQUIRTLE
    case 'reviewer':     return BULBASAUR
    case 'analyst':      return PIKACHU
    default:             return GENERIC
  }
}

/**
 * Draw a pixel-art character onto a PIXI.Graphics object.
 * @param g - target graphics (will not be cleared first)
 * @param pixels - 2D color array (0 = transparent)
 * @param pixelSize - size of each "pixel" in canvas units
 */
export function drawPixelChar(
  g: import('pixi.js').Graphics,
  pixels: number[][],
  pixelSize = 2
): void {
  for (let row = 0; row < pixels.length; row++) {
    const rowData = pixels[row]!
    for (let col = 0; col < rowData.length; col++) {
      const color = rowData[col]!
      if (color === 0) continue
      g.rect(col * pixelSize, row * pixelSize, pixelSize, pixelSize)
      g.fill(color)
    }
  }
}
