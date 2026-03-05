import * as PIXI from 'pixi.js'
import type { AgentRole } from '@openclaw/core'

const SPRITE_ASSETS = [
  { alias: 'orchestrator', src: '/sprites/charmander.png' },
  { alias: 'developer',    src: '/sprites/squirtle.png' },
  { alias: 'reviewer',     src: '/sprites/bulbasaur.png' },
  { alias: 'analyst',      src: '/sprites/pikachu.png' },
] as const

export async function preloadSprites(): Promise<void> {
  await PIXI.Assets.load([...SPRITE_ASSETS])
  for (const { alias } of SPRITE_ASSETS) {
    const tex = PIXI.Assets.get<PIXI.Texture>(alias)
    if (tex) tex.source.scaleMode = 'nearest'
  }
}

export function getSpriteTexture(role: AgentRole): PIXI.Texture {
  const known = SPRITE_ASSETS.map((a) => a.alias as string)
  const alias = known.includes(role) ? role : 'developer'
  return PIXI.Assets.get<PIXI.Texture>(alias) ?? PIXI.Texture.EMPTY
}
