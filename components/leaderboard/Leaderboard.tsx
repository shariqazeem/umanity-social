'use client'

import { useState, useEffect } from 'react'

interface LeaderboardUser {
  address: string
  username: string
  displayName: string
  totalContributed: number
  rewardPoints: number
  donationCount: number
  tipCountSent: number
}

export function Leaderboard() {
  const [tab, setTab] = useState<'donors' | 'earners' | 'active'>('donors')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({ topDonors: [], topEarners: [], mostActive: [] })

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      const result = await response.json()
      if (result.success) setData(result.leaderboards)
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const list = tab === 'donors' ? data.topDonors : tab === 'earners' ? data.topEarners : data.mostActive

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold">Leaderboard</h3>
        <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5">
          {(['donors', 'earners', 'active'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'donors' ? 'Top' : t === 'earners' ? 'Points' : 'Active'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No data yet</p>
      ) : (
        <div className="space-y-1">
          {list.map((user: LeaderboardUser, i: number) => (
            <div key={user.address} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-7 text-center">
                {i < 3 ? (
                  <span className="text-sm">{medals[i]}</span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">{i + 1}</span>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-500">{user.displayName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.displayName}</p>
                <p className="text-[10px] text-gray-400">@{user.username}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold counter">
                  {tab === 'donors' && `${user.totalContributed.toFixed(3)}`}
                  {tab === 'earners' && `${user.rewardPoints}`}
                  {tab === 'active' && `${user.donationCount + user.tipCountSent}`}
                </p>
                <p className="text-[10px] text-gray-400">
                  {tab === 'donors' ? 'SOL' : tab === 'earners' ? 'pts' : 'txns'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
