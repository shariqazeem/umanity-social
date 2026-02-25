'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { NFTCard } from './NFTCard'

interface ImpactNFT {
  id: string
  owner_address: string
  cause_name: string
  amount: number
  tier: string
  mint_signature?: string
  created_at: string
}

export function ImpactGallery() {
  const { publicKey } = useWallet()
  const [nfts, setNfts] = useState<ImpactNFT[]>([])
  const [allNfts, setAllNfts] = useState<ImpactNFT[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine')

  useEffect(() => {
    fetchNFTs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const fetchNFTs = async () => {
    try {
      const [myRes, allRes] = await Promise.allSettled([
        publicKey ? fetch(`/api/nft/gallery?walletAddress=${publicKey.toBase58()}`) : Promise.resolve(null),
        fetch('/api/nft/gallery'),
      ])

      if (myRes.status === 'fulfilled' && myRes.value) {
        const data = await myRes.value.json()
        if (data.nfts) setNfts(data.nfts)
      }

      if (allRes.status === 'fulfilled') {
        const data = await allRes.value.json()
        if (data.nfts) setAllNfts(data.nfts)
      }
    } catch {
      // Empty gallery
    } finally {
      setLoading(false)
    }
  }

  const displayNfts = viewMode === 'mine' ? nfts : allNfts

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 pt-2">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Impact</h2>
        <p className="text-gray-400 text-sm">Soulbound proof that you made a difference.</p>
      </div>

      {/* Stats + Filter */}
      <div className="card p-6 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Your NFTs</p>
              <p className="text-2xl font-bold counter">{nfts.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Community</p>
              <p className="text-2xl font-bold counter">{allNfts.length}</p>
            </div>
          </div>
          <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5">
            {(['mine', 'all'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  viewMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {m === 'mine' ? 'Mine' : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tier Legend */}
      <div className="flex items-center gap-4 mb-5 text-xs text-gray-400">
        <span>🥉 &lt;0.1</span>
        <span>🥈 0.1-0.5</span>
        <span>🥇 0.5-1.0</span>
        <span>💎 &gt;1.0 SOL</span>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-64" />)}
        </div>
      ) : displayNfts.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-gray-400 text-sm">
            {viewMode === 'mine' ? 'Make a donation to earn your first Impact NFT.' : 'No community NFTs yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-stagger">
          {displayNfts.map((nft) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="card p-5 mt-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🔒</span>
        </div>
        <div>
          <p className="text-sm font-medium">Soulbound Certificates</p>
          <p className="text-xs text-gray-400">Non-transferable impact certificates you earn through real donations.</p>
        </div>
      </div>
    </div>
  )
}
