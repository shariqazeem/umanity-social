'use client'

import { useState, useEffect } from 'react'
import { GradientAvatar } from '@/components/shared/GradientAvatar'

interface Connection {
  username: string
  bio?: string
}

interface SocialGraphProps {
  username: string
}

export function SocialGraph({ username }: SocialGraphProps) {
  const [followers, setFollowers] = useState<Connection[]>([])
  const [following, setFollowing] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [showGraph, setShowGraph] = useState(false)

  useEffect(() => {
    fetchConnections()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  const fetchConnections = async () => {
    try {
      const [followersRes, followingRes] = await Promise.allSettled([
        fetch(`/api/social/follow?type=followers&username=${username}`),
        fetch(`/api/social/follow?type=following&username=${username}`),
      ])

      if (followersRes.status === 'fulfilled') {
        const data = await followersRes.value.json()
        setFollowers(Array.isArray(data.followers) ? data.followers.map((f: any) => ({ username: f.username || f, bio: f.bio })) : [])
      }
      if (followingRes.status === 'fulfilled') {
        const data = await followingRes.value.json()
        setFollowing(Array.isArray(data.following) ? data.following.map((f: any) => ({ username: f.username || f, bio: f.bio })) : [])
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="skeleton h-20 mb-4" />
  }

  const allConnections = [...new Map([
    ...followers.map(f => [f.username, { ...f, isFollower: true, isFollowing: false }] as const),
    ...following.map(f => [f.username, { ...f, isFollower: false, isFollowing: true }] as const),
  ].map(([k, v]) => {
    const existing = followers.find(f => f.username === k) && following.find(f => f.username === k)
    return [k, { username: k, bio: v.bio, mutual: !!existing }]
  })).values()]

  const total = allConnections.length

  if (total === 0) {
    return (
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">Social Graph</p>
          <span className="text-[10px] text-gray-300">Tapestry Protocol</span>
        </div>
        <p className="text-sm text-gray-400">No connections yet. Follow impact makers in Explore!</p>
      </div>
    )
  }

  // Take top 12 connections for the radial display
  const displayed = allConnections.slice(0, 12)
  const radius = 100
  const centerX = 140
  const centerY = 120

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Social Graph</p>
          <p className="text-[11px] text-gray-300">{followers.length} followers · {following.length} following</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-300">Tapestry Protocol</span>
          <button
            onClick={() => setShowGraph(!showGraph)}
            className="btn-ghost px-3 py-1.5 text-[11px]"
          >
            {showGraph ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {showGraph && (
        <div className="relative overflow-hidden" style={{ height: 240, width: '100%' }}>
          <svg width="100%" height="240" viewBox="0 0 280 240">
            {/* Connection lines */}
            {displayed.map((conn, i) => {
              const angle = (i / displayed.length) * 2 * Math.PI - Math.PI / 2
              const x = centerX + radius * Math.cos(angle)
              const y = centerY + radius * Math.sin(angle)
              return (
                <line
                  key={`line-${conn.username}`}
                  x1={centerX}
                  y1={centerY}
                  x2={x}
                  y2={y}
                  stroke={conn.mutual ? '#10b981' : '#e5e7eb'}
                  strokeWidth={conn.mutual ? 2 : 1}
                  opacity={conn.mutual ? 0.7 : 0.4}
                />
              )
            })}
          </svg>

          {/* Center user */}
          <div
            className="absolute flex flex-col items-center"
            style={{
              left: `calc(50% - 18px)`,
              top: `calc(${centerY}px - 18px)`,
              transform: 'translateX(-50%) translateX(18px)',
            }}
          >
            <GradientAvatar username={username} size="md" />
            <span className="text-[9px] font-medium text-gray-600 mt-0.5">you</span>
          </div>

          {/* Connected nodes */}
          {displayed.map((conn, i) => {
            const angle = (i / displayed.length) * 2 * Math.PI - Math.PI / 2
            const x = centerX + radius * Math.cos(angle)
            const y = centerY + radius * Math.sin(angle)
            return (
              <div
                key={conn.username}
                className="absolute flex flex-col items-center"
                style={{
                  left: `calc(50% + ${x - centerX - 14}px)`,
                  top: `${y - 14}px`,
                }}
                title={`@${conn.username}${conn.mutual ? ' (mutual)' : ''}`}
              >
                <div className={`rounded-full ${conn.mutual ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
                  <GradientAvatar username={conn.username} size="sm" />
                </div>
                <span className="text-[8px] text-gray-400 mt-0.5 max-w-[50px] truncate">
                  @{conn.username}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {showGraph && (
        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-emerald-500 rounded" />
            Mutual
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-gray-300 rounded" />
            One-way
          </span>
          {total > 12 && <span>+{total - 12} more</span>}
        </div>
      )}
    </div>
  )
}
