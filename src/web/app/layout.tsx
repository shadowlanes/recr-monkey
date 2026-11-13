import { AuthProvider } from './components/auth/auth-provider';
import { DataProvider } from './contexts/data-context';
import type { Metadata } from 'next'
import { Schibsted_Grotesk, Spline_Sans, Spline_Sans_Mono } from 'next/font/google'
import './globals.css'

const schibsted = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-schibsted',
});
const splineSans = Spline_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-spline',
});
const splineMono = Spline_Sans_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-spline-mono',
});

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
      <body className={`${schibsted.variable} ${splineSans.variable} ${splineMono.variable}`}>
        <AuthProvider>
          <DataProvider>
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
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
