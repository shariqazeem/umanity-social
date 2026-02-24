'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { SearchBar } from './SearchBar'
import { SuggestedUsers } from './SuggestedUsers'
import { TrendingCauses } from './TrendingCauses'

export function ExplorePage() {
  const { publicKey } = useWallet()
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)

  useEffect(() => {
    if (publicKey) checkProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const checkProfile = async () => {
    if (!publicKey) return
    try {
      const res = await fetch(`/api/register/check?address=${publicKey.toBase58()}`)
      const data = await res.json()
      if (data.registered && data.user) {
        setCurrentUsername(data.user.username)
      }
    } catch {
      // Not registered
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 pt-2">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Explore</h2>
        <p className="text-gray-400 text-sm">Discover impact makers, causes, and stories.</p>
      </div>

      <SearchBar currentUsername={currentUsername} />
      <SuggestedUsers currentUsername={currentUsername} />
      <TrendingCauses />
    </div>
  )
}
