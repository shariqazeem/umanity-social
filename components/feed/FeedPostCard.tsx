'use client'

import { useState, useRef } from 'react'
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

function extractTextContent(data: Record<string, unknown>): string {
  if (typeof data.content === 'string' && data.content.length > 0) return data.content
  if (typeof data.text === 'string' && data.text.length > 0) return data.text
  if (data.content && typeof data.content === 'object') {
    const c = data.content as any
    if (typeof c.content === 'string' && c.content.length > 0) return c.content
    if (Array.isArray(c.properties)) {
      const cp = c.properties.find((p: any) => p.key === 'content')
      if (cp?.value) return cp.value
    }
  }
  const props = data.properties
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    const pc = (props as any).content
    if (typeof pc === 'string' && pc.length > 0) return pc
  }
  if (Array.isArray(props)) {
    const cp = props.find((p: any) => p.key === 'content')
    if (cp?.value) return cp.value
  }
  return ''
}

function extractProperties(data: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  const props = data.properties
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    for (const [k, v] of Object.entries(props as Record<string, unknown>)) {
      if (typeof v === 'string') result[k] = v
    }
  }
  if (Array.isArray(props)) {
    for (const p of props) {
      if (p.key && typeof p.value === 'string') result[p.key] = p.value
    }
  }
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
  const [heartAnimating, setHeartAnimating] = useState(false)
  const likeRef = useRef<HTMLButtonElement>(null)

  const username = (post.data.username as string)
    || (post.data.profileId as string)
    || ((post.data.authorProfile as any)?.username)
    || ((post.data.profile as any)?.username)
    || ((post.data.content as any)?.profileId)
    || 'unknown'
  const properties = extractProperties(post.data)
  const rawContent = extractTextContent(post.data)
  const content = rawContent.replace(/\bRISEN\b/g, 'Umanity').replace(/\brisen\b/g, 'Umanity')
  const commentCount = (post.data.commentCount as number) || (post.data.comments as number) || 0
  const createdAt = post.timestamp || (post.data.createdAt as string) || (post.data.created_at as string)

  const isDonation = post.type === 'donation_event' || properties.type === 'donation' || content.includes('Donated')
  const isTip = properties.type === 'tip' || content.includes('Sent')
  const isDare = properties.type === 'impact_dare' || content.includes('I dare @') || content.includes('IMPACT DARE')
  const isTrending = post.type === 'trending'
  const donationAmount = (post.data.amount as number) || 0
  const isWhale = isDonation && !isDare && donationAmount >= 5

  const newDareMatch = content.match(/I dare @(\S+) to donate ([\d.]+) SOL to (.+?)!/)
  const oldDareMatch = content.match(/committed ([\d.]+) SOL to (.+?)\.\s*@(\S+),/)
  const dareTarget = newDareMatch?.[1] || oldDareMatch?.[3]?.replace(',', '') || properties.dareTarget || ''
  const dareAmount = newDareMatch?.[2] || oldDareMatch?.[1] || properties.dareAmount || ''
  const darePoolRaw = newDareMatch?.[3] || oldDareMatch?.[2] || ''
  const darePoolEmoji = (darePoolRaw.match(/^(\S+)\s/)?.[1]) || properties.darePoolEmoji || '⚡'
  const darePoolName = darePoolRaw.replace(/^\S+\s/, '').trim() || properties.darePoolName || ''
  const poolIdMatch = content.match(/\/api\/actions\/donate\/([\w-]+)/)
  const darePoolId = poolIdMatch?.[1] || properties.darePool || ''
  const BLINK_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? window.location.origin
    : 'https://umanity-solana.vercel.app'
  const dareBlinkUrl = darePoolId ? `${BLINK_BASE}/api/actions/donate/${darePoolId}` : ''

  const handleLike = async () => {
    if (!currentUsername || loadingLike) return
    setLoadingLike(true)

    // Animate heart
    setHeartAnimating(true)
    setTimeout(() => setHeartAnimating(false), 400)

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
        const raw = data.comments
        if (Array.isArray(raw)) {
          setComments(raw.map((c: any) => ({ username: c.username || c.profileId || 'anon', text: c.text || c.content || '' })))
        }
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
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  }

  const dareHasMetadata = !!(dareTarget && dareAmount)

  return (
    <div className={`card p-4 mb-2.5 transition-all duration-300 ${isWhale ? 'whale-gradient shadow-whale relative overflow-hidden' : ''} ${isDare ? 'dare-card' : ''}`}>
      {/* Whale badge */}
      {isWhale && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
          <span className="text-[10px]">{'\u{1F40B}'}</span>
          <span className="text-[9px] font-semibold">Whale</span>
        </div>
      )}

      {/* Author */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <GradientAvatar username={username} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-[#1d1d1f]">@{username}</p>
            {isTrending && (
              <span className="text-[8px] font-semibold uppercase tracking-wider text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">Trending</span>
            )}
          </div>
          {createdAt && (
            <p className="text-[10px] text-[#aeaeb2]">{formatTime(createdAt)}</p>
          )}
        </div>
        {isDare && (
          <span className="pill bg-amber-50 text-amber-600 text-[9px] font-semibold">Dare</span>
        )}
        {isDonation && !isDare && (
          <span className="pill bg-emerald-50 text-emerald-600 text-[9px] font-semibold">Donation</span>
        )}
        {isTip && (
          <span className="pill bg-purple-50 text-purple-600 text-[9px] font-semibold">Tip</span>
        )}
      </div>

      {/* Content */}
      {isDare && dareHasMetadata ? (
        <div className="mb-3">
          <p className="text-[14px] text-[#1d1d1f] leading-relaxed mb-2.5">
            <strong>@{username}</strong> dared <strong>@{dareTarget}</strong> to donate{' '}
            <span className="font-bold text-amber-600">{dareAmount} SOL</span> to{' '}
            {darePoolEmoji} {darePoolName}!
          </p>

          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/40 p-3.5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-base">
                {darePoolEmoji || '⚡'}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#1d1d1f]">{darePoolName}</p>
                <p className="text-[10px] text-amber-600">{dareAmount} SOL challenge</p>
              </div>
            </div>
            {currentUsername === dareTarget && dareBlinkUrl && (
              <a
                href={`https://dial.to/?action=solana-action:${encodeURIComponent(`${dareBlinkUrl}?amount=${dareAmount}`)}&cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-semibold py-2.5 rounded-lg text-[13px] transition-all duration-200"
              >
                Match this Dare — {dareAmount} SOL
              </a>
            )}
            {currentUsername !== dareTarget && dareBlinkUrl && (
              <a
                href={`https://dial.to/?action=solana-action:${encodeURIComponent(dareBlinkUrl)}&cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-white/80 hover:bg-white text-[#1d1d1f] font-medium py-2 rounded-lg text-[11px] transition-all duration-200 border border-amber-200/40"
              >
                Donate to {darePoolName}
              </a>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[14px] text-[#1d1d1f] leading-[1.5] mb-3">{content}</p>
      )}

      {/* Donation details */}
      {isDonation && !isDare && post.type === 'donation_event' && (
        <div className="bg-emerald-50/60 rounded-xl p-3.5 mb-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-base">
            {properties?.poolEmoji || '💚'}
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-emerald-700">
              {(post.data.amount as number)?.toFixed(3) || '?'} SOL
            </p>
            <p className="text-[10px] text-emerald-600">
              to {(post.data.pool_name as string) || 'a cause'}
            </p>
          </div>
          {typeof post.data.signature === 'string' && (
            <a
              href={`https://solscan.io/tx/${post.data.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-emerald-500 font-medium hover:underline"
            >
              Verify
            </a>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center gap-1 pt-2 border-t border-black/[0.03]">
        {/* Like */}
        <button
          ref={likeRef}
          onClick={handleLike}
          disabled={!currentUsername || guestMode}
          title={guestMode ? 'Connect wallet to like' : undefined}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
            liked ? 'text-red-500 bg-red-50/50' : 'text-[#86868b] hover:text-red-500 hover:bg-red-50/30'
          } disabled:opacity-30 disabled:hover:bg-transparent`}
        >
          <span className={`text-[14px] ${heartAnimating ? 'heart-pop' : ''}`}>{liked ? '❤️' : '♡'}</span>
          <span className="counter">{likeCount}</span>
        </button>

        {/* Comment */}
        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.03] transition-all duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span className="counter">{comments.length || commentCount}</span>
        </button>

        {/* Share */}
        <a
          href={`https://x.com/intent/tweet?text=${encodeURIComponent(
            isDonation
              ? `Just donated ${(post.data.amount as number)?.toFixed(3) || ''} SOL to ${(post.data.pool_name as string) || 'a cause'} on @umanity_xyz!\n\nhttps://umanity-solana.vercel.app`
              : `${(content || '').slice(0, 180)}\n\nvia @umanity_xyz\nhttps://umanity-solana.vercel.app`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.03] transition-all duration-200 ml-auto"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
      </div>

      {/* Comments Thread */}
      {showComments && (
        <div className="mt-2.5 pt-2.5 border-t border-black/[0.03] content-reveal">
          {comments.length > 0 && (
            <div className="space-y-2 mb-2.5">
              {comments.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <GradientAvatar username={c.username} size="sm" />
                  <div className="bg-[#f5f5f7] rounded-xl px-3 py-2 flex-1">
                    <span className="text-[11px] font-semibold text-[#1d1d1f]">@{c.username}</span>
                    <p className="text-[12px] text-[#1d1d1f]/80 leading-relaxed">{c.text}</p>
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
                className="input flex-1 !py-2 !px-3 !text-[12px] !rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="btn-primary px-3 py-2 text-[11px] !rounded-lg"
              >
                Post
              </button>
            </div>
          ) : guestMode ? (
            <p className="text-[10px] text-[#aeaeb2] py-1.5">Connect wallet to comment.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
