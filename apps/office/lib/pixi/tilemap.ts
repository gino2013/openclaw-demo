import * as PIXI from 'pixi.js'

export const TILE_SIZE = 16
export const CANVAS_W = 160
export const CANVAS_H = 144

const COLORS = {
  floor: 0xe8d8a0,
  floorLine: 0xd0bc88,
  wall: 0xc8b896,
  wallTop: 0xa89070,
  desk: 0x7c5a3c,
  deskTop: 0x5a3c20,
  computer: 0xe0e8f0,
  computerBorder: 0x304860,
  plant: 0x306230,
  plantDark: 0x184818,
  pot: 0x8c5a34,
  portal: 0x6030c0,
  portalGlow: 0x9060ff,
} as const

function makeFloorTile(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  g.rect(0, 0, TILE_SIZE, TILE_SIZE)
  g.fill(COLORS.floor)
  g.moveTo(0, TILE_SIZE - 1).lineTo(TILE_SIZE, TILE_SIZE - 1)
  g.stroke({ color: COLORS.floorLine, width: 1 })
  g.moveTo(TILE_SIZE - 1, 0).lineTo(TILE_SIZE - 1, TILE_SIZE)
  g.stroke({ color: COLORS.floorLine, width: 1 })
  return g
}

function makeDeskTile(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  // Desk body
  g.rect(0, 3, TILE_SIZE, TILE_SIZE - 3)
  g.fill(COLORS.desk)
  // Top edge
  g.rect(0, 2, TILE_SIZE, 2)
  g.fill(COLORS.deskTop)
  // Screen border
  g.rect(3, 5, 10, 7)
  g.fill(COLORS.computerBorder)
  // Screen
  g.rect(4, 6, 8, 5)
  g.fill(COLORS.computer)
  return g
}

function makePlantTile(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  g.rect(0, 0, TILE_SIZE, TILE_SIZE)
  g.fill(COLORS.floor)
  // Pot
  g.rect(5, 11, 6, 4)
  g.fill(COLORS.pot)
  // Leaves
  g.ellipse(8, 7, 5, 5)
  g.fill(COLORS.plant)
  g.ellipse(5, 9, 3, 3)
  g.fill(COLORS.plant)
  g.ellipse(11, 9, 3, 3)
  g.fill(COLORS.plant)
  g.ellipse(8, 5, 3, 4)
  g.fill(COLORS.plantDark)
  return g
}

function makeWallTile(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  g.rect(0, 0, TILE_SIZE, TILE_SIZE)
  g.fill(COLORS.wall)
  g.rect(0, 0, TILE_SIZE, 3)
  g.fill(COLORS.wallTop)
  return g
}

export function makePortalTile(app: PIXI.Application): PIXI.Container {
  const container = new PIXI.Container()

  const base = new PIXI.Graphics()
  base.rect(0, 0, TILE_SIZE, TILE_SIZE)
  base.fill(COLORS.floor)
  container.addChild(base)

  const glow = new PIXI.Graphics()
  glow.ellipse(8, 8, 7, 8)
  glow.fill(COLORS.portal)
  glow.ellipse(8, 8, 5, 6)
  glow.fill(COLORS.portalGlow)
  container.addChild(glow)

  let tick = 0
  app.ticker.add(() => {
    tick += 0.05
    glow.alpha = 0.7 + Math.sin(tick) * 0.3
  })

  return container
}

type TileType = 'floor' | 'wall' | 'desk' | 'plant' | 'empty'

const LAYOUT: TileType[][] = [
  ['wall',  'wall',  'wall',  'wall',  'wall',  'wall',  'wall',  'wall',  'wall',  'wall'],
  ['wall',  'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall',  'floor', 'desk',  'floor', 'desk',  'floor', 'desk',  'floor', 'plant', 'wall'],
  ['wall',  'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall',  'floor', 'desk',  'floor', 'floor', 'floor', 'desk',  'floor', 'floor', 'wall'],
  ['wall',  'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall',  'floor', 'plant', 'floor', 'desk',  'floor', 'desk',  'floor', 'plant', 'wall'],
  ['wall',  'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall',  'wall',  'wall',  'wall',  'wall',  'wall',  'wall',  'wall',  'wall',  'wall'],
]

export function buildTilemap(container: PIXI.Container, app: PIXI.Application): void {
  for (let row = 0; row < LAYOUT.length; row++) {
    const rowData = LAYOUT[row]
    if (!rowData) continue
    for (let col = 0; col < rowData.length; col++) {
      const type = rowData[col]
      if (!type || type === 'empty') continue

      let tile: PIXI.Container

      switch (type) {
        case 'floor':  tile = makeFloorTile(); break
        case 'wall':   tile = makeWallTile(); break
        case 'desk':   tile = makeDeskTile(); break
        case 'plant':  tile = makePlantTile(); break
        default:       tile = makeFloorTile()
      }

      tile.position.set(col * TILE_SIZE, row * TILE_SIZE)
      container.addChild(tile)
    }
  }

  // Animated portal at row 1, col 1
  const portal = makePortalTile(app)
  portal.position.set(1 * TILE_SIZE, 1 * TILE_SIZE)
  container.addChild(portal)
}

export const SEAT_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 2, y: 2 },
  { x: 4, y: 2 },
  { x: 6, y: 2 },
  { x: 2, y: 4 },
  { x: 6, y: 4 },
  { x: 4, y: 6 },
]
