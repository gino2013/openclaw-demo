import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: '🦀 OpenClaw Office',
  description: 'Multi-Agent AI virtual office — Pokemon pixel art dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
