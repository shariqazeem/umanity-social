'use client'

import { useState, useEffect } from 'react'

interface ProofOrbProps {
  username: string
  totalDonated: number
  socialEngagement?: number // likes + comments received
  size?: 'sm' | 'md' | 'lg'
}

export function ProofOrb({ username, totalDonated, socialEngagement = 0, size = 'md' }: ProofOrbProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate orb intensity based on donations + social engagement
  const donationLevel = Math.min(totalDonated * 10, 10) // 0-10 scale
  const socialLevel = Math.min(socialEngagement * 0.5, 10) // 0-10 scale
  const intensity = Math.min((donationLevel + socialLevel) / 2, 10) // combined 0-10

  // Map intensity to visual properties
  const baseSize = size === 'sm' ? 40 : size === 'md' ? 64 : 96
  const orbSize = baseSize + (intensity * (baseSize * 0.15))
  const glowRadius = 10 + (intensity * 4)
  const opacity = 0.3 + (intensity * 0.07)

  // Color based on tier
  const getColor = () => {
    if (totalDonated >= 1.0) return { primary: '#3b82f6', secondary: '#8b5cf6' } // Diamond — blue/purple
    if (totalDonated >= 0.5) return { primary: '#eab308', secondary: '#f59e0b' } // Gold
    if (totalDonated >= 0.1) return { primary: '#9ca3af', secondary: '#d1d5db' } // Silver
    return { primary: '#10b981', secondary: '#34d399' } // Bronze/default — emerald
  }

  const color = getColor()

  if (!mounted) return null

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: orbSize, height: orbSize }}
      title={`${username}'s Impact Orb — ${totalDonated.toFixed(2)} SOL donated, ${socialEngagement} engagements`}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full orb-glow"
        style={{
          background: `radial-gradient(circle, ${color.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, ${color.secondary}15 50%, transparent 70%)`,
          boxShadow: `0 0 ${glowRadius}px ${color.primary}40, 0 0 ${glowRadius * 2}px ${color.primary}20`,
        }}
      />

      {/* Core orb */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: baseSize * 0.6,
          height: baseSize * 0.6,
          background: `radial-gradient(circle at 35% 35%, ${color.secondary}, ${color.primary})`,
          boxShadow: `inset 0 -2px 6px rgba(0,0,0,0.15), 0 2px 8px ${color.primary}50`,
        }}
      >
        <span
          className="font-bold text-white"
          style={{ fontSize: baseSize * 0.16 }}
        >
          {totalDonated >= 1 ? '💎' : totalDonated >= 0.5 ? '🥇' : totalDonated >= 0.1 ? '🥈' : '✦'}
        </span>
      </div>

      {/* Engagement ring — grows with social activity */}
      {socialEngagement > 0 && (
        <div
          className="absolute rounded-full border-2 animate-pulse"
          style={{
            width: orbSize * 0.85,
            height: orbSize * 0.85,
            borderColor: `${color.primary}30`,
          }}
        />
      )}
    </div>
  )
}

// ProofOrb Badge — inline version for feed posts
interface ProofOrbBadgeProps {
  totalDonated: number
  likes: number
  comments: number
}

export function ProofOrbBadge({ totalDonated, likes, comments }: ProofOrbBadgeProps) {
  const engagement = likes + comments
  const intensity = Math.min((totalDonated * 5) + (engagement * 0.3), 10)

  const getColor = () => {
    if (totalDonated >= 1.0) return '#3b82f6'
    if (totalDonated >= 0.5) return '#eab308'
    if (totalDonated >= 0.1) return '#9ca3af'
    return '#10b981'
  }

  const color = getColor()
  const size = 20 + (intensity * 1.5)

  return (
    <div
      className="inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}40, ${color}10)`,
        boxShadow: `0 0 ${4 + intensity}px ${color}30`,
      }}
      title={`Impact: ${totalDonated.toFixed(2)} SOL · ${engagement} engagements`}
    >
      <div
        className="rounded-full"
        style={{
          width: size * 0.5,
          height: size * 0.5,
          background: color,
          boxShadow: `0 0 4px ${color}60`,
        }}
      />
    </div>
  )
}
