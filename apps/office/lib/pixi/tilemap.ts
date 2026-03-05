import * as PIXI from 'pixi.js'

export const TILE_SIZE = 16

/** Native canvas size — bigger to match reference image layout */
export const CANVAS_W = 320
export const CANVAS_H = 240

const C = {
  floor:      0xd4b878,   // warm wood floor
  floorDark:  0xbc9c5c,   // floor shadow
  wall:       0xd8c8a8,   // cream wall
  wallShadow: 0xb8a880,   // wall shadow
  wallTop:    0xe8dcc0,   // wall highlight
  desk:       0x8c6840,   // desk brown
  deskTop:    0xac8858,   // desk top surface
  deskSide:   0x6c4820,   // desk side shadow
  screen:     0x1a3a5c,   // monitor (off)
  screenOn:   0x203050,   // monitor frame
  screenGlow: 0x50c8ff,   // screen content
  plant:      0x408040,
  plantLight: 0x60b060,
  pot:        0x8c5030,
  potDark:    0x6c3010,
  portal:     0x5020b0,
  portalGlow: 0x8040ff,
  portalCore: 0xd0a0ff,
  cable:      0x606060,   // connector lines between agents
} as const

// ── Tile factories ────────────────────────────────────────────────────────

function tile(draw: (g: PIXI.Graphics) => void): PIXI.Graphics {
  const g = new PIXI.Graphics()
  draw(g)
  return g
}

const makeFloor = (): PIXI.Graphics => tile((g) => {
  g.rect(0, 0, TILE_SIZE, TILE_SIZE); g.fill(C.floor)
  g.rect(0, 0, TILE_SIZE, 1);        g.fill(C.floorDark)
  g.rect(0, 0, 1, TILE_SIZE);        g.fill(C.floorDark)
})

const makeWall = (): PIXI.Graphics => tile((g) => {
  g.rect(0, 0, TILE_SIZE, TILE_SIZE); g.fill(C.wall)
  g.rect(0, 0, TILE_SIZE, 2);         g.fill(C.wallTop)
  g.rect(0, TILE_SIZE - 2, TILE_SIZE, 2); g.fill(C.wallShadow)
})

/** Desk tile — shows top surface + monitor */
const makeDesk = (): PIXI.Graphics => tile((g) => {
  // Desk top
  g.rect(0, 2, TILE_SIZE, 10); g.fill(C.deskTop)
  g.rect(0, 2, TILE_SIZE, 2);  g.fill(C.desk)
  g.rect(0, 12, TILE_SIZE, 4); g.fill(C.deskSide)
  // Monitor
  g.rect(3, 4, 10, 6);  g.fill(C.screenOn)
  g.rect(4, 5, 8, 4);   g.fill(C.screenGlow)
  // Stand
  g.rect(7, 10, 2, 2);  g.fill(C.deskSide)
})

const makePlant = (): PIXI.Graphics => tile((g) => {
  g.rect(0, 0, TILE_SIZE, TILE_SIZE); g.fill(C.floor)
  g.rect(5, 9, 6, 6);  g.fill(C.pot)
  g.rect(5, 9, 6, 2);  g.fill(C.potDark)
  g.ellipse(8, 7, 5, 6); g.fill(C.plant)
  g.ellipse(5, 9, 3, 3); g.fill(C.plant)
  g.ellipse(11, 9, 3, 3); g.fill(C.plant)
  g.ellipse(8, 5, 3, 4); g.fill(C.plantLight)
})

export function makePortalTile(app: PIXI.Application): PIXI.Container {
  const c = new PIXI.Container()
  const base = tile((g) => { g.rect(0, 0, TILE_SIZE, TILE_SIZE); g.fill(C.floor) })
  c.addChild(base)
  const glow = new PIXI.Graphics()
  c.addChild(glow)

  let t = 0
  app.ticker.add(() => {
    t += 0.05
    glow.clear()
    const r = 5 + Math.sin(t) * 1.5
    glow.ellipse(8, 8, r, r + 2); glow.fill(C.portal)
    glow.ellipse(8, 8, r - 2, r); glow.fill(C.portalGlow)
    glow.ellipse(8, 8, 2, 2);     glow.fill(C.portalCore)
  })
  return c
}

// ── Layout ────────────────────────────────────────────────────────────────
// 20 cols × 15 rows @ 16px = 320×240
type T = 'f' | 'w' | 'd' | 'p' | '.'

// prettier-ignore
const MAP: T[][] = [
  ['w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w'],
  ['w','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','w'],
  ['w','f','d','f','f','d','f','f','d','f','f','d','f','f','d','f','f','d','p','w'],
  ['w','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','w'],
  ['w','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','w'],
  ['w','f','d','f','f','d','f','f','f','f','f','f','f','f','d','f','f','d','f','w'],
  ['w','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','w'],
  ['w','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','w'],
  ['w','f','d','f','f','d','f','f','d','f','f','d','f','f','d','f','f','d','p','w'],
  ['w','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','w'],
  ['w','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','w'],
  ['w','p','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','p','w'],
  ['w','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','w'],
  ['w','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','f','w'],
  ['w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w','w'],
]

export function buildTilemap(container: PIXI.Container, app: PIXI.Application): void {
  for (let row = 0; row < MAP.length; row++) {
    const rowData = MAP[row]!
    for (let col = 0; col < rowData.length; col++) {
      const t = rowData[col]!
      let tile: PIXI.Container
      switch (t) {
        case 'w': tile = makeWall();  break
        case 'd': tile = makeDesk();  break
        case 'p': tile = makePlant(); break
        default:  tile = makeFloor()
      }
      tile.position.set(col * TILE_SIZE, row * TILE_SIZE)
      container.addChild(tile)
    }
  }

  // Portal — top-left open area
  const portal = makePortalTile(app)
  portal.position.set(9 * TILE_SIZE, 6 * TILE_SIZE)
  container.addChild(portal)
}

/**
 * Seat positions (in tile coordinates) — where each agent stands.
 * Layout mirrors reference: agents at desks around the room.
 */
export const SEAT_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 9,  y: 6  },  // 0: Orchestrator — center (portal)
  { x: 2,  y: 2  },  // 1: Dev Alpha    — top-left desk
  { x: 5,  y: 2  },  // 2: Dev Beta     — top desk
  { x: 14, y: 2  },  // 3: Reviewer     — top-right desk
  { x: 17, y: 2  },  // 4: Analyst      — far top-right
  { x: 2,  y: 5  },  // 5: extra slot
  { x: 17, y: 5  },  // 6: extra slot
  { x: 2,  y: 8  },  // 7: extra slot
  { x: 8,  y: 8  },  // 8: extra slot
]
