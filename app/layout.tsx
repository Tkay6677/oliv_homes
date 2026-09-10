import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { OlivStateProvider } from '@/lib/oliv-client-state'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = { title: 'OLIV Homes — A home that feels like you', description: 'Discover thoughtful spaces, trusted people, and a simpler way to move into a life you love.' }
export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#26352d' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark bg-background"><body className={`${geist.variable} ${geistMono.variable} antialiased`}><OlivStateProvider>{children}</OlivStateProvider>{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
