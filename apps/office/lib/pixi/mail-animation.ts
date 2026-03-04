import * as PIXI from 'pixi.js'

export interface Position {
  x: number
  y: number
}

/**
 * Draws a tiny 8×8 pixel envelope sprite.
 * // TODO: replace with actual pixel art sprite
 */
function makeEnvelope(): PIXI.Graphics {
  const g = new PIXI.Graphics()
  // Envelope body
  g.rect(0, 2, 8, 6).fill(0xf8f8f0)
  g.rect(0, 2, 8, 6).stroke({ color: 0x101010, width: 1 })
  // Flap V shape
  g.moveTo(0, 2).lineTo(4, 5).lineTo(8, 2).stroke({ color: 0x303030, width: 1 })
  return g
}

/**
 * Animates a pixel-art envelope flying from `from` to `to` along a
 * quadratic Bézier arc. Calls `onArrival` when the envelope reaches the target.
 *
 * @param app - The PIXI application (provides ticker and stage)
 * @param from - Start position in canvas pixels
 * @param to - End position in canvas pixels
 * @param onArrival - Callback invoked when the animation completes
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

  // Control point for the arc — midpoint lifted upward
  const cpX = (from.x + to.x) / 2
  const cpY = Math.min(from.y, to.y) - 30

  let t = 0
  const DURATION = 60 // frames at 60fps ≈ 1 second

  function tick(): void {
    t += 1 / DURATION

    if (t >= 1) {
      t = 1
      app.ticker.remove(tick)
      app.stage.removeChild(envelope)
      envelope.destroy()
      onArrival()
      return
    }

    // Quadratic Bézier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const mt = 1 - t
    const x = mt * mt * from.x + 2 * mt * t * cpX + t * t * to.x
    const y = mt * mt * from.y + 2 * mt * t * cpY + t * t * to.y

    envelope.position.set(x, y)

    // Gentle rotation during flight
    envelope.rotation = Math.sin(t * Math.PI * 2) * 0.3
  }

  app.ticker.add(tick)
}

/**
 * Plays delegation animations sequentially for a chain of agents.
 *
 * @param app - PIXI application
 * @param chain - Array of positions in order (source → … → target)
 * @param onComplete - Called after all hops complete
 */
export function animateDelegationChain(
  app: PIXI.Application,
  chain: Position[],
  onComplete: () => void
): void {
  if (chain.length < 2) {
    onComplete()
    return
  }

  let i = 0

  function next(): void {
    const from = chain[i]
    const to = chain[i + 1]
    if (!from || !to) {
      onComplete()
      return
    }
    i++
    animateTaskDelegation(app, from, to, () => {
      if (i < chain.length - 1) {
        next()
      } else {
        onComplete()
      }
    })
  }

  next()
}
