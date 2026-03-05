import * as PIXI from 'pixi.js'

export interface Position {
  x: number
  y: number
}

function makeEnvelope(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  g.rect(0, 4, 24, 18)
  g.fill(0xf8f8f0)
  g.rect(0, 4, 24, 18)
  g.stroke({ color: 0x101010, width: 2 })
  g.moveTo(0, 4).lineTo(12, 14).lineTo(24, 4)
  g.stroke({ color: 0x303030, width: 2 })
  return g
}

/**
 * Animates a pixel envelope flying from `from` to `to` along a Bézier arc.
 * Calls `onArrival` when complete.
 */
export function animateTaskDelegation(
  app: PIXI.Application,
  from: Position,
  to: Position,
  onArrival: () => void
): void {
  const envelope = makeEnvelope()
  envelope.position.set(from.x, from.y)
  app.stage.addChild(envelope)

  const cpX = (from.x + to.x) / 2
  const cpY = Math.min(from.y, to.y) - 120

  let t = 0
  const DURATION = 60

  const tick = (): void => {
    t += 1 / DURATION
    if (t >= 1) {
      t = 1
      app.ticker.remove(tick)
      app.stage.removeChild(envelope)
      envelope.destroy()
      onArrival()
      return
    }
    const mt = 1 - t
    const x = mt * mt * from.x + 2 * mt * t * cpX + t * t * to.x
    const y = mt * mt * from.y + 2 * mt * t * cpY + t * t * to.y
    envelope.position.set(x, y)
    envelope.rotation = Math.sin(t * Math.PI * 2) * 0.3
  }

  app.ticker.add(tick)
}

export function animateDelegationChain(
  app: PIXI.Application,
  chain: Position[],
  onComplete: () => void
): void {
  if (chain.length < 2) { onComplete(); return }
  let i = 0
  const next = (): void => {
    const from = chain[i]
    const to = chain[i + 1]
    if (!from || !to) { onComplete(); return }
    i++
    animateTaskDelegation(app, from, to, () => {
      if (i < chain.length - 1) next()
      else onComplete()
    })
  }
  next()
}
