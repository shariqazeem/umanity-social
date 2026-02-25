'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { FeedPostCard } from './FeedPostCard'
import { FeedComposer } from './FeedComposer'
import { FeedProposalCard } from './FeedProposalCard'
import { GradientAvatar } from '@/components/shared/GradientAvatar'

interface FeedItem {
  type: 'post' | 'donation_event' | 'proposal' | 'trending' | 'suggested_follow'
  id: string
  data: Record<string, unknown>
  timestamp?: string
}

export function SmartFeed() {
  const { publicKey } = useWallet()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)

  useEffect(() => {
    if (publicKey) checkProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const checkProfile = async () => {
    if (!publicKey) return
    try {
      const res = await fetch(`/api/register/check?address=${publicKey.toBase58()}`)
      const data = await res.json()
      if (data.registered && data.user) {
        setCurrentUsername(data.user.username)
      }
    } catch {
      // Not registered
    }
  }

  const fetchFeed = useCallback(async () => {
    if (!currentUsername) {
      // Fallback: show global feed
      try {
        const res = await fetch('/api/social/feed')
        const data = await res.json()
        if (data.posts) {
          setFeed(data.posts.map((p: Record<string, unknown>) => ({
            type: 'post' as const,
            id: p.id as string,
            data: p,
            timestamp: p.createdAt as string,
          })))
        }
      } catch {
        // Empty
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const addressParam = publicKey ? `&address=${publicKey.toBase58()}` : ''
      const res = await fetch(`/api/feed/smart?username=${currentUsername}${addressParam}`)
      const data = await res.json()
      if (data.feed) {
        setFeed(data.feed)
      }
    } catch {
      // Empty feed
    } finally {
      setLoading(false)
    }
  }, [currentUsername, publicKey])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  // Optimistically add a new post to the top of the feed
  const handlePostCreated = useCallback((content: string) => {
    if (!currentUsername) return
    const optimisticPost: FeedItem = {
      type: 'post',
      id: `optimistic_${Date.now()}`,
      data: {
        username: currentUsername,
        profileId: currentUsername,
        content,
        properties: { type: 'manual' },
        likeCount: 0,
        commentCount: 0,
      },
      timestamp: new Date().toISOString(),
    }
    setFeed(prev => [optimisticPost, ...prev])
  }, [currentUsername])

  const renderFeedItem = (item: FeedItem) => {
    switch (item.type) {
      case 'proposal':
        return (
          <FeedProposalCard
            key={item.id}
            proposal={item.data as FeedItem['data'] & {
              id: string; title: string; description: string; options: string[];
              status: string; total_votes: number; created_at: string; closes_at: string;
            }}
            voterAddress={publicKey?.toBase58() || ''}
            onVoted={fetchFeed}
          />
        )

      case 'suggested_follow':
        return <SuggestedFollowCard key={item.id} profile={item.data} currentUsername={currentUsername} />

      case 'post':
      case 'donation_event':
      case 'trending':
      default:
        return (
          <FeedPostCard
            key={item.id}
            post={item}
            currentUsername={currentUsername}
          />
        )
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 pt-2">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Feed</h2>
        <p className="text-gray-400 text-sm">Your network&apos;s impact, live.</p>
        <span className="text-[10px] text-gray-300">Powered by Tapestry Protocol</span>
      </div>

      {currentUsername && (
        <div className="mb-4">
          <FeedComposer username={currentUsername} onPostCreated={handlePostCreated} />
        </div>
      )}

      {!currentUsername && (
        <div className="card p-5 mb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">✦</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Register to post</p>
            <p className="text-xs text-gray-400">Connect your wallet and create a profile to start posting.</p>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-36" />)}
          </div>
        ) : feed.length === 0 ? (
          <div className="space-y-0">
            <div className="card p-5 mb-1 border-l-4 border-l-emerald-400">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-2">Example</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">S</div>
                <span className="text-sm font-medium">@satoshi</span>
                <span className="text-xs text-gray-300">2h ago</span>
              </div>
              <p className="text-sm text-gray-600">Donated 0.5 SOL to Gaza Medical Relief on Umanity! Every bit helps. {'\u{1F49A}'}</p>
            </div>
            <div className="card p-5 mb-1 border-l-4 border-l-blue-400">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-2">Example</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">V</div>
                <span className="text-sm font-medium">@vitalik</span>
                <span className="text-xs text-gray-300">5h ago</span>
              </div>
              <p className="text-sm text-gray-600">Just reached Sprout tier on Umanity! Building impact on-chain. {'\u{1F331}'}</p>
            </div>
            <div className="card p-5 mb-1 border-l-4 border-l-purple-400">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 mb-2">Example</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">A</div>
                <span className="text-sm font-medium">@anatoly</span>
                <span className="text-xs text-gray-300">1d ago</span>
              </div>
              <p className="text-sm text-gray-600">5 donations and counting! The Solana community is incredible. {'\u26A1}'}</p>
            </div>
            <div className="card p-8 text-center mt-3">
              <p className="text-gray-400 text-sm font-medium">Follow impact makers to fill your feed</p>
              <p className="text-gray-300 text-xs mt-1">Head to the Explore tab to discover people and causes.</p>
            </div>
          </div>
        ) : (
          <div className="animate-stagger">
            {feed.map(renderFeedItem)}
          </div>
        )}
      </div>

      {feed.length > 0 && (
        <div className="mt-6 text-center">
          <button onClick={fetchFeed} className="btn-ghost px-4 py-2 text-xs">
            Refresh feed
          </button>
        </div>
      )}
    </div>
  )
}

function SuggestedFollowCard({ profile, currentUsername }: { profile: Record<string, unknown>; currentUsername: string | null }) {
  const [followed, setFollowed] = useState(false)
  const [loading, setLoading] = useState(false)

  const username = (profile.username as string) || 'unknown'
  const bio = (profile.bio as string) || ''

  const handleFollow = async () => {
    if (!currentUsername || loading) return
    setLoading(true)
    try {
      await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower: currentUsername, followee: username }),
      })
      setFollowed(true)
    } catch {
      // fail silently
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5 mb-3 border-l-4 border-l-blue-400">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-3">Suggested for you</p>
      <div className="flex items-center gap-3">
        <GradientAvatar username={username} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">@{username}</p>
          {bio && <p className="text-xs text-gray-400 truncate">{bio}</p>}
        </div>
        <button
          onClick={handleFollow}
          disabled={followed || loading || !currentUsername}
          className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
            followed
              ? 'bg-gray-100 text-gray-400'
              : 'btn-primary'
          }`}
        >
          {followed ? 'Following' : 'Follow'}
        </button>
      </div>
    </div>
  )
}
