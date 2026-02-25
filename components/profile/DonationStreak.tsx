'use client'

import { useState, useEffect } from 'react'

interface StreakData {
  currentStreak: number
  longestStreak: number
  lastDonationDate: string | null
  totalDays: number
  donationDays: string[]
}

interface DonationStreakProps {
  address: string
}

export function DonationStreak({ address }: DonationStreakProps) {
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStreak()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const fetchStreak = async () => {
    try {
      const res = await fetch(`/api/streaks?address=${address}`)
      const data = await res.json()
      setStreak(data)
    } catch {
      // Streak load error
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="skeleton h-28 mb-4" />
  }

  if (!streak) return null

  const isOnFire = streak.currentStreak >= 3

  // Build the last 7 days array
  const today = new Date()
  const last7Days: { dateStr: string; label: string; donated: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' })
    last7Days.push({
      dateStr,
      label: dayLabel,
      donated: streak.donationDays.includes(dateStr),
    })
  }

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Flame icon with optional glow */}
          <div className={`relative flex items-center justify-center ${isOnFire ? 'animate-pulse' : ''}`}>
            <span
              className="text-2xl"
              style={isOnFire ? {
                filter: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.7)) drop-shadow(0 0 16px rgba(251, 146, 60, 0.4))',
              } : undefined}
            >
              🔥
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold counter">{streak.currentStreak}</span>
              <span className="text-xs text-gray-400">day streak</span>
            </div>
            {isOnFire && (
              <span className="inline-block pill text-[10px] font-semibold text-orange-600 bg-orange-50 mt-0.5">
                On fire
              </span>
            )}
          </div>
        </div>

        {/* Secondary stats */}
        <div className="text-right space-y-0.5">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-xs text-gray-400">Best</span>
            <span className="text-sm font-semibold counter">{streak.longestStreak}d</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-xs text-gray-400">Total</span>
            <span className="text-sm font-semibold counter">{streak.totalDays}d</span>
          </div>
        </div>
      </div>

      {/* 7-day calendar row */}
      <div className="pt-3 border-t border-black/[0.03]">
        <div className="flex items-center justify-between">
          {last7Days.map((day) => (
            <div key={day.dateStr} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-gray-300 font-medium">{day.label}</span>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  day.donated
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
                    : 'bg-gray-100 border border-gray-200/60'
                }`}
              >
                {day.donated && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
