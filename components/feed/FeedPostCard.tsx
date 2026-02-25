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
}

export function FeedPostCard({ post, currentUsername }: FeedPostCardProps) {
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
  const properties = (post.data.properties as Record<string, string>) || {}
  const rawContent = typeof post.data.content === 'string'
    ? post.data.content
    : typeof properties?.content === 'string'
      ? properties.content
      : typeof post.data.text === 'string'
        ? post.data.text
        : typeof (post.data.content as any)?.content === 'string'
          ? (post.data.content as any).content
          : ''
  const content = rawContent || ''
  const commentCount = (post.data.commentCount as number) || (post.data.comments as number) || 0
  const createdAt = post.timestamp || (post.data.createdAt as string) || (post.data.created_at as string)

  const isDonation = post.type === 'donation_event' || properties?.type === 'donation' || content.includes('Donated')
  const isTip = properties?.type === 'tip' || content.includes('Sent')
  const isTrending = post.type === 'trending'

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

  return (
    <div className="card p-5 mb-3">
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
        {isDonation && (
          <span className="pill bg-emerald-50 text-emerald-600 text-[10px]">Donation</span>
        )}
        {isTip && (
          <span className="pill bg-purple-50 text-purple-600 text-[10px]">Tip</span>
        )}
      </div>

      <p className="text-[15px] text-gray-800 leading-relaxed mb-4">{content}</p>

      {/* Donation details */}
      {isDonation && post.type === 'donation_event' && (
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
          disabled={!currentUsername}
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

          {currentUsername && (
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
          )}
        </div>
      )}
    </div>
  )
}
