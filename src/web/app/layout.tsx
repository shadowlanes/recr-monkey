import { AuthProvider } from './components/auth/auth-provider';
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
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
