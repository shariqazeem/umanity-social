'use client'

import { useState, useEffect } from 'react'
import { GradientAvatar } from '@/components/shared/GradientAvatar'

interface SuggestedProfile {
  username: string
  bio?: string
}

interface SuggestedUsersProps {
  currentUsername: string | null
}

export function SuggestedUsers({ currentUsername }: SuggestedUsersProps) {
  const [profiles, setProfiles] = useState<SuggestedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [followedSet, setFollowedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (currentUsername) fetchSuggested()
    else setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUsername])

  const fetchSuggested = async () => {
    try {
      const res = await fetch(`/api/social/suggested?username=${currentUsername}`)
      const data = await res.json()
      setProfiles(data.profiles || [])
    } catch {
      // No suggestions
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (username: string) => {
    if (!currentUsername) return
    try {
      await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower: currentUsername, followee: username }),
      })
      setFollowedSet(prev => new Set(prev).add(username))
    } catch {
      // fail silently
    }
  }

  if (loading) {
    return (
      <section className="mb-8">
        <h3 className="text-lg font-bold tracking-tight mb-4">Suggested for you</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-16" />)}
        </div>
      </section>
    )
  }

  if (profiles.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="text-lg font-bold tracking-tight mb-4">Suggested for you</h3>
      <div className="space-y-2 animate-stagger">
        {profiles.slice(0, 6).map((profile) => (
          <div key={profile.username} className="card p-4 flex items-center gap-3">
            <GradientAvatar username={profile.username} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">@{profile.username}</p>
              {profile.bio && <p className="text-xs text-gray-400 truncate">{profile.bio}</p>}
            </div>
            <button
              onClick={() => handleFollow(profile.username)}
              disabled={followedSet.has(profile.username)}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
                followedSet.has(profile.username)
                  ? 'bg-gray-100 text-gray-400'
                  : 'btn-primary'
              }`}
            >
              {followedSet.has(profile.username) ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
