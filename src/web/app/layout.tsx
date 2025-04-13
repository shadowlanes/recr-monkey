import { AuthProvider } from './components/auth/auth-provider';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Recr-Monkey | Track Your Recurring Payments',
  description: 'Keep track of all subscription and recurring payments in one place',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <div className="logo">
                <h1 className="text-2xl font-bold text-indigo-600">Recr-Monkey</h1>
              </div>
              {/* Navigation will be dynamically updated based on auth state */}
              <nav id="main-nav" className="flex gap-4"></nav>
            </div>
          </header>
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
