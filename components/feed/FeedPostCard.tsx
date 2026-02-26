'use client'

import { useState } from 'react'
import { GradientAvatar } from '@/components/shared/GradientAvatar'

interface FeedPostCardProps {
  post: {
    id: string
    data: Record<string, unknown>
    type: string
    timestamp?: string
  }
  currentUsername: string | null
  guestMode?: boolean
}

// Deep-extract text content from any Tapestry data shape
function extractTextContent(data: Record<string, unknown>): string {
  // 1. data.content is a string (already extracted by normalizeItem)
  if (typeof data.content === 'string' && data.content.length > 0) return data.content
  // 2. data.text is a string
  if (typeof data.text === 'string' && data.text.length > 0) return data.text
  // 3. data.content is an object with .content string
  if (data.content && typeof data.content === 'object') {
    const c = data.content as any
    if (typeof c.content === 'string' && c.content.length > 0) return c.content
    // 3b. nested content object might have properties array with content key
    if (Array.isArray(c.properties)) {
      const cp = c.properties.find((p: any) => p.key === 'content')
      if (cp?.value) return cp.value
    }
  }
  // 4. Flat properties object has content key
  const props = data.properties
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    const pc = (props as any).content
    if (typeof pc === 'string' && pc.length > 0) return pc
  }
  // 5. Properties is an array (raw Tapestry format)
  if (Array.isArray(props)) {
    const cp = props.find((p: any) => p.key === 'content')
    if (cp?.value) return cp.value
  }
  return ''
}

// Deep-extract properties from any Tapestry data shape
function extractProperties(data: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  // 1. data.properties is already a flat object
  const props = data.properties
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    for (const [k, v] of Object.entries(props as Record<string, unknown>)) {
      if (typeof v === 'string') result[k] = v
    }
  }
  // 2. data.properties is an array (raw Tapestry)
  if (Array.isArray(props)) {
    for (const p of props) {
      if (p.key && typeof p.value === 'string') result[p.key] = p.value
    }
  }
  // 3. data.content.properties
  if (data.content && typeof data.content === 'object') {
    const cp = (data.content as any).properties
    if (Array.isArray(cp)) {
      for (const p of cp) {
        if (p.key && typeof p.value === 'string' && !result[p.key]) result[p.key] = p.value
      }
    } else if (cp && typeof cp === 'object') {
      for (const [k, v] of Object.entries(cp as Record<string, unknown>)) {
        if (typeof v === 'string' && !result[k]) result[k] = v
      }
    }
    // Also grab type/contentType from content object
    const co = data.content as any
    if (typeof co.type === 'string' && !result.type) result.type = co.type
    if (typeof co.contentType === 'string' && !result.contentType) result.contentType = co.contentType
  }
  return result
}

export function FeedPostCard({ post, currentUsername, guestMode = false }: FeedPostCardProps) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(
    (post.data.likeCount as number) || (post.data.likes as number) || 0
  )
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<{ username: string; text: string }[]>([])
  const [loadingLike, setLoadingLike] = useState(false)

  const username = (post.data.username as string)
    || (post.data.profileId as string)
    || ((post.data.authorProfile as any)?.username)
    || ((post.data.profile as any)?.username)
    || ((post.data.content as any)?.profileId)
    || 'unknown'
  const properties = extractProperties(post.data)
  const rawContent = extractTextContent(post.data)
  // Normalize old "RISEN" branding to "Umanity"
  const content = rawContent.replace(/\bRISEN\b/g, 'Umanity').replace(/\brisen\b/g, 'Umanity')
  const commentCount = (post.data.commentCount as number) || (post.data.comments as number) || 0
  const createdAt = post.timestamp || (post.data.createdAt as string) || (post.data.created_at as string)

  const isDonation = post.type === 'donation_event' || properties.type === 'donation' || content.includes('Donated')
  const isTip = properties.type === 'tip' || content.includes('Sent')
  const isDare = properties.type === 'impact_dare' || content.includes('I dare @') || content.includes('IMPACT DARE')
  const isTrending = post.type === 'trending'
  const donationAmount = (post.data.amount as number) || 0
  const isWhale = isDonation && !isDare && donationAmount >= 5

  // Parse dare metadata from content text AND properties (try all sources)
  // New format: "I dare @target to donate X SOL to emoji PoolName!"
  // Old format: "IMPACT DARE: I just committed X SOL to emoji PoolName. @target, I dare you to match it!"
  const newDareMatch = content.match(/I dare @(\S+) to donate ([\d.]+) SOL to (.+?)!/)
  const oldDareMatch = content.match(/committed ([\d.]+) SOL to (.+?)\.\s*@(\S+),/)
  const dareTarget = newDareMatch?.[1] || oldDareMatch?.[3]?.replace(',', '') || properties.dareTarget || ''
  const dareAmount = newDareMatch?.[2] || oldDareMatch?.[1] || properties.dareAmount || ''
  const darePoolRaw = newDareMatch?.[3] || oldDareMatch?.[2] || ''
  const darePoolEmoji = (darePoolRaw.match(/^(\S+)\s/)?.[1]) || properties.darePoolEmoji || '⚡'
  const darePoolName = darePoolRaw.replace(/^\S+\s/, '').trim() || properties.darePoolName || ''
  // Extract pool ID from content or properties, then build the canonical Blink URL
  const poolIdMatch = content.match(/\/api\/actions\/donate\/([\w-]+)/)
  const darePoolId = poolIdMatch?.[1] || properties.darePool || ''
  // Always use the deployed URL for Blink actions (dial.to needs a public URL)
  const BLINK_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? window.location.origin
    : 'https://umanity-solana.vercel.app'
  const dareBlinkUrl = darePoolId ? `${BLINK_BASE}/api/actions/donate/${darePoolId}` : ''

  const handleLike = async () => {
    if (!currentUsername || loadingLike) return
    setLoadingLike(true)
    try {
      if (liked) {
        await fetch('/api/social/like', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUsername, contentId: post.data.id || post.id }),
        })
        setLikeCount((c) => Math.max(0, c - 1))
      } else {
        await fetch('/api/social/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUsername, contentId: post.data.id || post.id }),
        })
        setLikeCount((c) => c + 1)
      }
      setLiked(!liked)
    } catch {
      // Silently fail
    } finally {
      setLoadingLike(false)
    }
  }

  const handleComment = async () => {
    if (!currentUsername || !commentText.trim()) return
    try {
      await fetch('/api/social/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          contentId: post.data.id || post.id,
          text: commentText.trim(),
        }),
      })
      setComments((prev) => [...prev, { username: currentUsername, text: commentText.trim() }])
      setCommentText('')
    } catch {
      // Silently fail
    }
  }

  const loadComments = async () => {
    if (!showComments) {
      try {
        const res = await fetch(`/api/social/comment?contentId=${post.data.id || post.id}`)
        const data = await res.json()
        if (data.comments) setComments(data.comments)
      } catch {
        // Empty
      }
    }
    setShowComments(!showComments)
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = Date.now()
    const diff = now - d.getTime()
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return d.toLocaleDateString()
  }

  // If dare was detected but regex failed to parse metadata, show content as plain text
  const dareHasMetadata = !!(dareTarget && dareAmount)

  return (
    <div className={`card p-5 mb-3 ${isWhale ? 'whale-gradient shadow-whale relative overflow-hidden' : ''} ${isDare ? 'dare-card' : ''}`}>
      {isWhale && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
          <span className="text-xs">{'\u{1F40B}'}</span>
          <span className="text-[10px] font-semibold">Whale Alert</span>
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <GradientAvatar username={username} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">@{username}</p>
            {isTrending && (
              <span className="pill bg-amber-50 text-amber-600 text-[9px] py-0.5 px-2">Trending</span>
            )}
          </div>
          {createdAt && (
            <p className="text-[10px] text-gray-400">{formatTime(createdAt)}</p>
          )}
        </div>
        {isDare && (
          <span className="pill bg-amber-50 text-amber-600 text-[10px]">Impact Dare</span>
        )}
        {isDonation && !isDare && (
          <span className="pill bg-emerald-50 text-emerald-600 text-[10px]">Donation</span>
        )}
        {isTip && (
          <span className="pill bg-purple-50 text-purple-600 text-[10px]">Tip</span>
        )}
      </div>

      {/* Dare-specific rendering */}
      {isDare && dareHasMetadata ? (
        <div className="mb-4">
          <p className="text-[15px] text-gray-800 leading-relaxed mb-3">
            <strong>@{username}</strong> dared <strong>@{dareTarget}</strong> to donate{' '}
            <span className="font-bold text-amber-600">{dareAmount} SOL</span> to{' '}
            {darePoolEmoji} {darePoolName}!
          </p>

          {/* Dare action card */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg">
                {darePoolEmoji || '⚡'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{darePoolName}</p>
                <p className="text-[11px] text-amber-600">{dareAmount} SOL challenge</p>
              </div>
            </div>
            {currentUsername === dareTarget && dareBlinkUrl && (
              <a
                href={`https://dial.to/?action=solana-action:${encodeURIComponent(`${dareBlinkUrl}?amount=${dareAmount}`)}&cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Match this Dare — {dareAmount} SOL
              </a>
            )}
            {currentUsername !== dareTarget && dareBlinkUrl && (
              <a
                href={`https://dial.to/?action=solana-action:${encodeURIComponent(dareBlinkUrl)}&cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-xs transition-colors"
              >
                Donate to {darePoolName}
              </a>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[15px] text-gray-800 leading-relaxed mb-4">{content}</p>
      )}

      {/* Donation details */}
      {isDonation && !isDare && post.type === 'donation_event' && (
        <div className="bg-emerald-50/50 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">
            {properties?.poolEmoji || '💚'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-700">
              {(post.data.amount as number)?.toFixed(3) || '?'} SOL
            </p>
            <p className="text-[11px] text-emerald-600">
              to {(post.data.pool_name as string) || 'a cause'}
            </p>
          </div>
          {typeof post.data.signature === 'string' && (
            <a
              href={`https://solscan.io/tx/${post.data.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-emerald-500 underline"
            >
              tx
            </a>
          )}
        </div>
      )}

      <div className="flex items-center gap-5 pt-3 border-t border-black/[0.03]">
        <button
          onClick={handleLike}
          disabled={!currentUsername || guestMode}
          title={guestMode ? 'Connect wallet to like' : undefined}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
          } disabled:opacity-40`}
        >
          <span>{liked ? '❤️' : '♡'}</span>
          <span>{likeCount}</span>
        </button>

        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span>💬</span>
          <span>{comments.length || commentCount}</span>
        </button>

        <a
          href={`https://x.com/intent/tweet?text=${encodeURIComponent(
            isDonation
              ? `Just donated ${(post.data.amount as number)?.toFixed(3) || ''} SOL to ${(post.data.pool_name as string) || 'a cause'} on @umanity_xyz! On-chain, transparent, community-governed.\n\nhttps://umanity.xyz`
              : `${(content || '').slice(0, 180)}\n\nvia @umanity_xyz\nhttps://umanity.xyz`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors ml-auto"
        >
          <span>&#119831;</span>
          <span>Share</span>
        </a>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-black/[0.03]">
          {comments.length > 0 && (
            <div className="space-y-2 mb-3">
              {comments.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <GradientAvatar username={c.username} size="sm" />
                  <div>
                    <span className="text-xs font-medium">@{c.username}</span>
                    <p className="text-xs text-gray-500">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentUsername && !guestMode ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                maxLength={280}
                className="input flex-1 !py-2.5 !px-3.5 !text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="btn-primary px-4 py-2 text-xs"
              >
                Post
              </button>
            </div>
          ) : guestMode ? (
            <p className="text-[11px] text-gray-400 py-2">Connect a wallet to comment.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
