import * as PIXI from 'pixi.js'

export const TILE_SIZE = 64

/** Native canvas size — 20×15 tiles @ 64px */
export const CANVAS_W = 1280
export const CANVAS_H = 960

const C = {
  floor:      0xd4b878,
  floorDark:  0xbc9c5c,
  wall:       0xd8c8a8,
  wallShadow: 0xb8a880,
  wallTop:    0xe8dcc0,
  desk:       0x8c6840,
  deskTop:    0xac8858,
  deskSide:   0x6c4820,
  screenOn:   0x203050,
  screenGlow: 0x50c8ff,
  plant:      0x408040,
  plantLight: 0x60b060,
  pot:        0x8c5030,
  potDark:    0x6c3010,
  portal:     0x5020b0,
  portalGlow: 0x8040ff,
  portalCore: 0xd0a0ff,
} as const

function tile(draw: (g: PIXI.Graphics) => void): PIXI.Graphics {
  const g = new PIXI.Graphics()
  draw(g)
  return g
}

const makeFloor = (): PIXI.Graphics => tile((g) => {
  g.rect(0, 0, TILE_SIZE, TILE_SIZE); g.fill(C.floor)
  g.rect(0, 0, TILE_SIZE, 4);         g.fill(C.floorDark)
  g.rect(0, 0, 4, TILE_SIZE);         g.fill(C.floorDark)
})

const makeWall = (): PIXI.Graphics => tile((g) => {
  g.rect(0, 0, TILE_SIZE, TILE_SIZE);     g.fill(C.wall)
  g.rect(0, 0, TILE_SIZE, 8);             g.fill(C.wallTop)
  g.rect(0, TILE_SIZE - 8, TILE_SIZE, 8); g.fill(C.wallShadow)
})

const makeDesk = (): PIXI.Graphics => tile((g) => {
  g.rect(0,  8, TILE_SIZE, 40); g.fill(C.deskTop)
  g.rect(0,  8, TILE_SIZE,  8); g.fill(C.desk)
  g.rect(0, 48, TILE_SIZE, 16); g.fill(C.deskSide)
  // Monitor
  g.rect(12, 16, 40, 24); g.fill(C.screenOn)
  g.rect(16, 20, 32, 16); g.fill(C.screenGlow)
  // Stand
  g.rect(28, 40,  8,  8); g.fill(C.deskSide)
})

const makePlant = (): PIXI.Graphics => tile((g) => {
  g.rect(0, 0, TILE_SIZE, TILE_SIZE); g.fill(C.floor)
  g.rect(20, 36, 24, 24); g.fill(C.pot)
  g.rect(20, 36, 24,  8); g.fill(C.potDark)
  g.ellipse(32, 28, 20, 24); g.fill(C.plant)
  g.ellipse(20, 36, 12, 12); g.fill(C.plant)
  g.ellipse(44, 36, 12, 12); g.fill(C.plant)
  g.ellipse(32, 20, 12, 16); g.fill(C.plantLight)
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
    const r = 20 + Math.sin(t) * 6
    glow.ellipse(32, 32, r, r + 8); glow.fill(C.portal)
    glow.ellipse(32, 32, r - 8, r); glow.fill(C.portalGlow)
    glow.ellipse(32, 32, 8, 8);     glow.fill(C.portalCore)
  })
  return c
}

// ── Layout — 20 cols × 15 rows @ 64px = 1280×960 ──────────────────────────
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

  const portal = makePortalTile(app)
  portal.position.set(9 * TILE_SIZE, 6 * TILE_SIZE)
  container.addChild(portal)
}

export const SEAT_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 9,  y: 6  },  // 0: Orchestrator — portal center
  { x: 2,  y: 2  },  // 1
  { x: 5,  y: 2  },  // 2
  { x: 14, y: 2  },  // 3
  { x: 17, y: 2  },  // 4
  { x: 2,  y: 5  },  // 5
  { x: 17, y: 5  },  // 6
  { x: 2,  y: 8  },  // 7
  { x: 8,  y: 8  },  // 8
]
