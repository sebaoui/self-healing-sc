import type { Metadata } from 'next'
import { SettingsProvider } from '../context/SettingsContext'
import { getTitleSelector } from '../data/settingsStore'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Articles Blog',
  description: 'A minimalistic articles blog',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const currentSelector = getTitleSelector();

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <SettingsProvider initialSelector={currentSelector}>
          <header style={{ padding: '1rem 2rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#333', fontSize: '1.5rem', fontWeight: 'bold' }}>
              Articles Blog
            </Link>
            <Link href="/settings" style={{ textDecoration: 'none', color: '#666', fontSize: '1rem' }}>
              Settings
            </Link>
          </header>
          <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            {children}
          </main>
        </SettingsProvider>
      </body>
    </html>
  )
}