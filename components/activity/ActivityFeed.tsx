'use client'

import { useState, useEffect } from 'react'

interface Activity {
  id: string
  type: 'donation' | 'pool_donation' | 'tip'
  user: string
  username?: string
  amount: number
  poolName?: string
  recipientUsername?: string
  message?: string
  timestamp: string
  signature: string
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activity')
      const data = await response.json()
      if (data.success) setActivities(data.activities)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold">Activity</h3>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <div className="pulse-dot" />
          Live
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-10" />)}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No activity yet</p>
      ) : (
        <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                a.type === 'tip' ? 'bg-purple-50 text-purple-500' :
                a.type === 'pool_donation' ? 'bg-blue-50 text-blue-500' :
                'bg-emerald-50 text-emerald-500'
              }`}>
                {a.type === 'tip' ? '⚡' : a.type === 'pool_donation' ? '🌍' : '♡'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700">
                  <span className="font-medium">{a.username || 'Anon'}</span>
                  {a.type === 'tip' ? ` tipped @${a.recipientUsername}` :
                   a.type === 'pool_donation' ? ` donated to ${a.poolName}` :
                   ' donated'}
                </p>
                {a.message && <p className="text-[11px] text-gray-400 truncate">{a.message}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold counter">{a.amount.toFixed(3)}</p>
                <p className="text-[10px] text-gray-400">{timeAgo(a.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
