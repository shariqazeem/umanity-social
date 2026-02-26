import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from '@/components/wallet/WalletProvider'

export const metadata: Metadata = {
  title: 'Umanity — Crypto Charity, Resurrected',
  description: 'The social impact network on Solana. Transparent donations, community governance, social proof. Built for the Solana Graveyard Hackathon.',
  openGraph: {
    title: 'Umanity — Crypto Charity, Resurrected',
    description: 'The social impact network on Solana. Transparent donations via on-chain escrow, community governance, and social proof powered by Tapestry Protocol.',
    siteName: 'Umanity',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umanity — Crypto Charity, Resurrected',
    description: 'Social impact network on Solana. On-chain escrow, DAO governance, social feed. Resurrecting what crypto killed.',
    creator: '@umanity_xyz',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="text-gray-900 overflow-x-hidden">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
