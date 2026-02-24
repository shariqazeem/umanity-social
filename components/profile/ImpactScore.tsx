'use client'

import { useState, useEffect } from 'react'

interface ImpactScoreData {
  donations: number
  consistency: number
  governance: number
  social: number
  tipping: number
  referrals: number
  loyalty: number
  total: number
  tier: string
}

const TIER_COLORS: Record<string, string> = {
  'Seedling': 'text-gray-500 bg-gray-50',
  'Sprout': 'text-green-600 bg-green-50',
  'Bloom': 'text-emerald-600 bg-emerald-50',
  'Champion': 'text-blue-600 bg-blue-50',
  'Legend': 'text-purple-600 bg-purple-50',
  'Luminary': 'text-amber-600 bg-amber-50',
}

interface ImpactScoreProps {
  address: string
  username: string
}

export function ImpactScore({ address, username }: ImpactScoreProps) {
  const [score, setScore] = useState<ImpactScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    fetchScore()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, username])

  const fetchScore = async () => {
    try {
      const res = await fetch(`/api/impact-score?address=${address}&username=${username}`)
      const data = await res.json()
      setScore(data)
    } catch {
      // Default score
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="skeleton h-24 mb-4" />
  }

  if (!score) return null

  const tierColor = TIER_COLORS[score.tier] || TIER_COLORS['Seedling']

  const breakdown = [
    { label: 'Donations', value: score.donations, max: 300 },
    { label: 'Consistency', value: score.consistency, max: 100 },
    { label: 'Governance', value: score.governance, max: 150 },
    { label: 'Social', value: score.social, max: 200 },
    { label: 'Tipping', value: score.tipping, max: 100 },
    { label: 'Referrals', value: score.referrals, max: 100 },
    { label: 'Loyalty', value: score.loyalty, max: 50 },
  ]

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs text-gray-400 mb-1">Impact Score</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold counter">{score.total}</span>
            <span className={`pill text-[11px] font-semibold ${tierColor}`}>{score.tier}</span>
          </div>
        </div>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="btn-ghost px-3 py-1.5 text-[11px]"
        >
          {showBreakdown ? 'Hide' : 'Details'}
        </button>
      </div>

      {showBreakdown && (
        <div className="mt-4 pt-4 border-t border-black/[0.03] space-y-3">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">{item.label}</span>
                <span className="text-xs font-medium counter">{item.value}/{item.max}</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
