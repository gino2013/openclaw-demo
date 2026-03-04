import * as PIXI from 'pixi.js'

/** Tile size in GBA pixels */
export const TILE_SIZE = 16

/** Native GBA canvas dimensions */
export const CANVAS_W = 160
export const CANVAS_H = 144

// Tile color palette (GBA-inspired, ≤32 colors)
const COLORS = {
  floor: 0xe8d8a0,       // beige floor
  floorLine: 0xd0bc88,   // floor grid lines
  wall: 0xc8b896,        // wall
  wallTop: 0xa89070,     // wall top edge
  desk: 0x7c5a3c,        // desk surface
  deskTop: 0x5a3c20,     // desk top edge
  computer: 0xe0e8f0,    // computer screen (light)
  computerBorder: 0x304860, // computer border
  plant: 0x306230,       // plant leaves
  plantDark: 0x184818,   // plant shadow
  pot: 0x8c5a34,         // flower pot
  portal: 0x6030c0,      // orchestrator portal
  portalGlow: 0x9060ff,  // portal glow
} as const

/**
 * Creates a 16×16 floor tile (beige with subtle grid lines).
 */
function makeFloorTile(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  g.rect(0, 0, TILE_SIZE, TILE_SIZE).fill(COLORS.floor)
  // Grid lines
  g.moveTo(0, TILE_SIZE - 1).lineTo(TILE_SIZE, TILE_SIZE - 1).stroke({ color: COLORS.floorLine, width: 1 })
  g.moveTo(TILE_SIZE - 1, 0).lineTo(TILE_SIZE - 1, TILE_SIZE).stroke({ color: COLORS.floorLine, width: 1 })
  return g
}

/**
 * Creates a 16×16 desk tile (brown with computer screen).
 * // TODO: replace with actual pixel art sprites
 */
function makeDeskTile(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  // Desk body
  g.rect(0, 3, TILE_SIZE, TILE_SIZE - 3).fill(COLORS.desk)
  // Top edge
  g.rect(0, 2, TILE_SIZE, 2).fill(COLORS.deskTop)
  // Computer screen
  g.rect(3, 5, 10, 7).fill(COLORS.computerBorder)
  g.rect(4, 6, 8, 5).fill(COLORS.computer)
  return g
}

/**
 * Creates a 16×16 plant tile (green leaves + brown pot).
 * // TODO: replace with actual pixel art sprites
 */
function makePlantTile(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  // Floor background
  g.rect(0, 0, TILE_SIZE, TILE_SIZE).fill(COLORS.floor)
  // Pot
  g.rect(5, 11, 6, 4).fill(COLORS.pot)
  // Leaves
  g.ellipse(8, 7, 5, 5).fill(COLORS.plant)
  g.ellipse(5, 9, 3, 3).fill(COLORS.plant)
  g.ellipse(11, 9, 3, 3).fill(COLORS.plant)
  g.ellipse(8, 5, 3, 4).fill(COLORS.plantDark)
  return g
}

/**
 * Creates a 16×16 wall tile.
 */
function makeWallTile(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  g.rect(0, 0, TILE_SIZE, TILE_SIZE).fill(COLORS.wall)
  g.rect(0, 0, TILE_SIZE, 3).fill(COLORS.wallTop)
  return g
}

/**
 * Creates an animated portal tile (Orchestrator entrance).
 * The glow pulsates via a ticker.
 */
export function makePortalTile(app: PIXI.Application): PIXI.Container {
  const container = new PIXI.Container()

  const base = new PIXI.Graphics()
  base.rect(0, 0, TILE_SIZE, TILE_SIZE).fill(COLORS.floor)
  container.addChild(base)

  const portal = new PIXI.Graphics()
  portal.ellipse(8, 8, 6, 7).fill(COLORS.portal)
  portal.ellipse(8, 8, 4, 5).fill(COLORS.portalGlow)
  container.addChild(portal)

  // Pulsating glow animation
  let tick = 0
  app.ticker.add(() => {
    tick += 0.05
    portal.alpha = 0.7 + Math.sin(tick) * 0.3
    portal.scale.set(1 + Math.sin(tick * 0.5) * 0.05)
  })

  return container
}

/** Tile type identifiers */
type TileType = 'floor' | 'wall' | 'desk' | 'plant' | 'empty'

/**
 * Simple office layout map (10×9 tiles = 160×144 px).
 * F=floor, W=wall, D=desk, P=plant
 */
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

/**
 * Renders the office tilemap into the provided PIXI container.
 *
 * @param container - The PIXI container to render tiles into
 * @param app - The PIXI application (needed for animated tiles)
 */
export function buildTilemap(container: PIXI.Container, app: PIXI.Application): void {
  for (let row = 0; row < LAYOUT.length; row++) {
    const rowData = LAYOUT[row]
    if (!rowData) continue
    for (let col = 0; col < rowData.length; col++) {
      const type = rowData[col]
      if (!type || type === 'empty') continue

      let tile: PIXI.DisplayObject

      switch (type) {
        case 'floor':
          tile = makeFloorTile()
          break
        case 'wall':
          tile = makeWallTile()
          break
        case 'desk':
          tile = makeDeskTile()
          break
        case 'plant':
          tile = makePlantTile()
          break
        default:
          tile = makeFloorTile()
      }

      tile.position.set(col * TILE_SIZE, row * TILE_SIZE)
      container.addChild(tile)
    }
  }

  // Portal in top-left area (row 1, col 1) — overrides floor
  const portalContainer = makePortalTile(app)
  portalContainer.position.set(1 * TILE_SIZE, 1 * TILE_SIZE)
  container.addChild(portalContainer)
}

/**
 * Predefined seat positions (tile coords) for agents.
 * Keys are display indices (0–5).
 */
export const SEAT_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 2, y: 2 },  // seat 0 — desk row 2 col 2
  { x: 4, y: 2 },  // seat 1
  { x: 6, y: 2 },  // seat 2
  { x: 2, y: 4 },  // seat 3
  { x: 6, y: 4 },  // seat 4
  { x: 4, y: 6 },  // seat 5
]
