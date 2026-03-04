import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@openclaw/core'],
  // Pixi.js requires these for proper SSR handling
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), { canvas: 'canvas' }]
    return config
  },
}

export default nextConfig
