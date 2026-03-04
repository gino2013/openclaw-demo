import type { NextRequest } from 'next/server'

const GATEWAY_URL = process.env['NEXT_PUBLIC_GATEWAY_SSE_URL'] ?? 'http://localhost:18789/events'

/**
 * SSE proxy — forwards Gateway events to the browser.
 * Avoids CORS issues when Gateway and Office run on different origins.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const upstreamRes = await fetch(GATEWAY_URL, {
    headers: {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    signal: req.signal,
  })

  if (!upstreamRes.ok || !upstreamRes.body) {
    return new Response('Gateway unavailable', { status: 502 })
  }

  return new Response(upstreamRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
