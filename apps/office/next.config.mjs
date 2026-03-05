/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@openclaw/core'],
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), { canvas: 'canvas' }]
    return config
  },
}

export default nextConfig
