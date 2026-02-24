'use client'

import { useState, useEffect } from 'react'

interface Pool {
  id: string
  name: string
  description: string
  totalDonated: number
  donorCount: number
}

const POOL_META: Record<string, { emoji: string; category: string; color: string }> = {
  medical: { emoji: '🏥', category: 'Healthcare', color: 'bg-red-50 text-red-600' },
  education: { emoji: '📚', category: 'Education', color: 'bg-blue-50 text-blue-600' },
  disaster: { emoji: '🆘', category: 'Emergency', color: 'bg-orange-50 text-orange-600' },
  water: { emoji: '💧', category: 'Infrastructure', color: 'bg-cyan-50 text-cyan-600' },
}

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
      const sorted = (data.pools || []).sort((a: Pool, b: Pool) => b.totalDonated - a.totalDonated)
      setPools(sorted)
    } catch {
      // No pools
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
                <span>·</span>
                <span>{pool.donorCount} donors</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
