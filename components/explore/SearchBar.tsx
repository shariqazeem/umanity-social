'use client'

import { useState, useEffect, useRef } from 'react'
import { GradientAvatar } from '@/components/shared/GradientAvatar'

interface SearchResult {
  username: string
  bio?: string
  walletAddress?: string
}

interface SearchBarProps {
  currentUsername: string | null
}

export function SearchBar({ currentUsername }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [followedSet, setFollowedSet] = useState<Set<string>>(new Set())
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/social/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.profiles || [])
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleFollow = async (username: string) => {
    if (!currentUsername || followingInProgress.has(username) || followedSet.has(username)) return
    setFollowingInProgress(prev => new Set(prev).add(username))
    try {
      const res = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower: currentUsername, followee: username }),
      })
      if (res.ok) {
        setFollowedSet(prev => new Set(prev).add(username))
      }
    } catch {
      // fail silently
    } finally {
      setFollowingInProgress(prev => {
        const next = new Set(prev)
        next.delete(username)
        return next
      })
    }
  }

  return (
    <div ref={containerRef} className="relative mb-6">
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search users..."
          className="input !pl-11 !pr-10"
        />
        {loading && (
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-black/[0.05] z-50 max-h-80 overflow-y-auto">
          {results.map((user, idx) => (
            <div key={`${user.username}_${idx}`} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
              <GradientAvatar username={user.username} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">@{user.username}</p>
                {user.bio && <p className="text-xs text-gray-400 truncate">{user.bio}</p>}
              </div>
              {currentUsername && currentUsername !== user.username && (
                <button
                  onClick={() => handleFollow(user.username)}
                  disabled={followedSet.has(user.username) || followingInProgress.has(user.username)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                    followedSet.has(user.username)
                      ? 'bg-gray-100 text-gray-400'
                      : followingInProgress.has(user.username)
                        ? 'bg-gray-100 text-gray-400'
                        : 'btn-primary'
                  }`}
                >
                  {followedSet.has(user.username) ? 'Following' : followingInProgress.has(user.username) ? '...' : 'Follow'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-black/[0.05] z-50 p-6 text-center">
          <p className="text-sm text-gray-400">No users found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
}
