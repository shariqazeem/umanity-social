'use client'

import { useState, useEffect } from 'react'
import { POOL_META } from '@/lib/constants'

interface Pool {
  id: string
  name: string
  description: string
  totalDonated: number
  donorCount: number
}

// Fallback pools matching the on-chain strategic pools
const FALLBACK_POOLS: Pool[] = [
  { id: 'palestine-red-crescent', name: 'Palestine Red Crescent Society', description: 'Medical aid & emergency relief for civilians in Palestine via PRCS', totalDonated: 0, donorCount: 0 },
  { id: 'turkish-red-crescent', name: 'Turkish Red Crescent (Kizilay)', description: 'Earthquake recovery & disaster relief via Turkish Red Crescent', totalDonated: 0, donorCount: 0 },
  { id: 'mercy-corps', name: 'Mercy Corps', description: 'Clean water, food security & crisis response worldwide', totalDonated: 0, donorCount: 0 },
  { id: 'edhi-foundation', name: 'Edhi Foundation', description: 'Healthcare, orphan care & emergency services via Edhi Foundation Pakistan', totalDonated: 0, donorCount: 0 },
  { id: 'orphanage-aid', name: 'Local Orphanage Aid', description: 'Supplies, education & care for local orphanages — Umanity delivers personally', totalDonated: 0, donorCount: 0 },
  { id: 'animal-rescue', name: 'Street Animal Rescue', description: 'Rescue, shelter & medical care for street animals — Umanity delivers personally', totalDonated: 0, donorCount: 0 },
]

export function TrendingCauses() {
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPools()
  }, [])

  const fetchPools = async () => {
    try {
      const res = await fetch('/api/pools')
      const data = await res.json()
      const fetched = (data.pools || []) as Pool[]
      // Build a map of fetched pools that match our pool IDs
      const fetchedMap = new Map<string, Pool>()
      for (const p of fetched) {
        if (POOL_META[p.id]) fetchedMap.set(p.id, p)
      }
      // Merge: use API data where available, fallback data for the rest
      const merged = FALLBACK_POOLS.map(fb => fetchedMap.get(fb.id) || fb)
        .sort((a, b) => b.totalDonated - a.totalDonated)
      setPools(merged)
    } catch {
      setPools(FALLBACK_POOLS)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="mb-8">
        <h3 className="text-lg font-bold tracking-tight mb-4">Trending causes</h3>
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-20" />)}
        </div>
      </section>
    )
  }

  if (pools.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="text-lg font-bold tracking-tight mb-4">Trending causes</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-stagger">
        {pools.map((pool) => {
          const meta = POOL_META[pool.id]
          if (!meta) return null
          return (
            <div key={pool.id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">
                  {meta.emoji}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{pool.name}</h4>
                  <span className={`pill ${meta.color} text-[9px]`}>{meta.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="font-bold text-gray-900 counter">{pool.totalDonated.toFixed(3)} SOL</span>
                <span>{'\u00B7'}</span>
                <span>{pool.donorCount} donors</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
