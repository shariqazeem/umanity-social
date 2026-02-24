'use client'

import { useState } from 'react'
import { GradientAvatar } from '@/components/shared/GradientAvatar'

interface FeedComposerProps {
  username: string
  onPostCreated: () => void
}

export function FeedComposer({ username, onPostCreated }: FeedComposerProps) {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    if (!content.trim() || posting) return
    setPosting(true)
    try {
      await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          content: content.trim(),
          properties: { type: 'manual' },
        }),
      })
      setContent('')
      onPostCreated()
    } catch {
      // Silently fail
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <GradientAvatar username={username} size="lg" />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your impact story..."
            maxLength={500}
            rows={3}
            className="input resize-none !text-sm"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-gray-400">{content.length}/500</span>
            <button
              onClick={handlePost}
              disabled={!content.trim() || posting}
              className="btn-primary px-5 py-2 text-xs"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
