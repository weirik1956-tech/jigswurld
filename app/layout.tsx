import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { PlayerProvider } from './player-context'
import Footer from './components/Footer'

export const metadata: Metadata = {
  title: "JIG'SWurlD — Discover Independent Music & Support Artists",
  description: "Discover independent artists, stream new music, follow creators, and support them directly with tips. Where artists get heard, not buried.",
  openGraph: {
    title: "JIG'SWurlD — Independent Music Platform",
    description: "Stream new music, follow artists, and support creators directly. Keep your masters, grow your audience.",
    url: "https://jigswurld.com",
    siteName: "JIG'SWurlD",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JIG'SWurlD — Independent Music Platform",
    description: "Stream new music, follow artists, and support creators directly.",
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      
      <body>
        <PlayerProvider>{children}</PlayerProvider>
        <Footer />
      </body>
    </html>
  )
}