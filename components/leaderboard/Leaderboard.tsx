'use client'

import { useState, useEffect } from 'react'
import { GradientAvatar } from '@/components/shared/GradientAvatar'

interface LeaderboardUser {
  address: string
  username: string
  displayName: string
  totalContributed: number
  rewardPoints: number
  donationCount: number
  tipCountSent: number
}

interface SocialLeaderEntry {
  username: string
  followers: number
}

type Tab = 'donors' | 'earners' | 'active' | 'social'

export function Leaderboard() {
  const [tab, setTab] = useState<Tab>('donors')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({ topDonors: [], topEarners: [], mostActive: [] })
  const [socialLeaders, setSocialLeaders] = useState<SocialLeaderEntry[]>([])

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [leaderRes, socialRes] = await Promise.allSettled([
        fetch('/api/leaderboard'),
        fetch('/api/social/leaderboard?namespace=umanity'),
      ])

      if (leaderRes.status === 'fulfilled') {
        const result = await leaderRes.value.json()
        if (result.success) setData(result.leaderboards)
      }

      if (socialRes.status === 'fulfilled') {
        const result = await socialRes.value.json()
        // Tapestry leaderboard returns entries array
        const entries = result.entries || result.profiles || []
        setSocialLeaders(
          entries
            .filter((e: any) => e.username || e.profile?.username)
            .map((e: any) => ({
              username: e.username || e.profile?.username || 'unknown',
              followers: e.followerCount ?? e.followers ?? e.score ?? 0,
            }))
            .sort((a: SocialLeaderEntry, b: SocialLeaderEntry) => b.followers - a.followers)
            .slice(0, 10)
        )
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const list = tab === 'donors' ? data.topDonors : tab === 'earners' ? data.topEarners : tab === 'active' ? data.mostActive : []

  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}']

  const tabs: { key: Tab; label: string }[] = [
    { key: 'donors', label: 'Top' },
    { key: 'earners', label: 'Points' },
    { key: 'social', label: 'Social' },
    { key: 'active', label: 'Active' },
  ]

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold">Leaderboard</h3>
        <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
        </div>
      ) : tab === 'social' ? (
        socialLeaders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No social data yet</p>
        ) : (
          <div className="space-y-1">
            {socialLeaders.map((user, i) => (
              <div key={user.username} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-7 text-center">
                  {i < 3 ? (
                    <span className="text-sm">{medals[i]}</span>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">{i + 1}</span>
                  )}
                </div>
                <GradientAvatar username={user.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">@{user.username}</p>
                  <p className="text-[10px] text-gray-300">via Tapestry</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold counter">{user.followers}</p>
                  <p className="text-[10px] text-gray-400">followers</p>
                </div>
              </div>
            ))}
          </div>
        )
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
              <GradientAvatar username={user.username} size="sm" />
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
