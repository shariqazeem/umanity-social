'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { GradientAvatar } from '@/components/shared/GradientAvatar'
import { ProofOrb } from '@/components/social/ProofOrbs'
import { ImpactScore } from './ImpactScore'
import { DonationStreak } from './DonationStreak'
import { SocialGraph } from './SocialGraph'
import { getTierConfig } from '@/lib/nft'

function getUserTierLabel(totalDonated: number): string {
  if (totalDonated >= 1.0) return 'Diamond'
  if (totalDonated >= 0.5) return 'Gold'
  if (totalDonated >= 0.1) return 'Silver'
  return 'Bronze'
}

interface UserProfile {
  address: string
  username: string
  displayName: string
  bio: string
  totalDonated: number
  donationCount: number
  rewardPoints: number
  tipCountSent: number
  created_at: string
}

interface NFT {
  id: string
  tier: string
  cause_name: string
  amount: number
  owner_address: string
  created_at: string
}

export function ProfilePage() {
  const { publicKey } = useWallet()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [nfts, setNfts] = useState<NFT[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editingBio, setEditingBio] = useState(false)
  const [newBio, setNewBio] = useState('')
  const [savingBio, setSavingBio] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    if (publicKey) fetchProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const fetchProfile = async () => {
    if (!publicKey) return
    try {
      const res = await fetch(`/api/register/check?address=${publicKey.toBase58()}`)
      const data = await res.json()
      if (data.registered && data.user) {
        const user = data.user
        setProfile({
          address: publicKey.toBase58(),
          username: user.username,
          displayName: user.displayName || user.display_name,
          bio: user.bio || '',
          totalDonated: user.totalDonated || user.total_donated || 0,
          donationCount: user.donationCount || user.donation_count || 0,
          rewardPoints: user.rewardPoints || user.reward_points || 0,
          tipCountSent: user.tipCountSent || user.tip_count_sent || 0,
          created_at: user.created_at || user.createdAt || new Date().toISOString(),
        })
        setNewBio(user.bio || '')

        // Fetch social stats & NFTs in parallel
        const username = user.username
        const [followersRes, followingRes, nftRes] = await Promise.allSettled([
          fetch(`/api/social/follow?type=followers&username=${username}`),
          fetch(`/api/social/follow?type=following&username=${username}`),
          fetch(`/api/nft/gallery?address=${publicKey.toBase58()}`),
        ])

        if (followersRes.status === 'fulfilled') {
          const d = await followersRes.value.json()
          setFollowerCount(Array.isArray(d.followers) ? d.followers.length : 0)
        }
        if (followingRes.status === 'fulfilled') {
          const d = await followingRes.value.json()
          setFollowingCount(Array.isArray(d.following) ? d.following.length : 0)
        }
        if (nftRes.status === 'fulfilled') {
          const d = await nftRes.value.json()
          setNfts(d.nfts || [])
        }
      }
    } catch {
      // Profile load error
    } finally {
      setLoading(false)
    }
  }

  const saveBio = async () => {
    if (!profile) return
    setSavingBio(true)
    try {
      await fetch('/api/social/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username, bio: newBio }),
      })
      setProfile({ ...profile, bio: newBio })
      setEditingBio(false)
    } catch {
      // fail
    } finally {
      setSavingBio(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="skeleton h-40" />
        <div className="skeleton h-24" />
        <div className="skeleton h-32" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto card p-16 text-center">
        <p className="text-gray-400 text-sm">Connect your wallet and register to see your profile.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 pt-2">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Profile</h2>
        <p className="text-gray-400 text-sm">Your impact, permanently on-chain.</p>
      </div>

      {/* Profile Header Card */}
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <GradientAvatar username={profile.username} size="xl" />
            {profile.totalDonated > 0 && (
              <div className="absolute -bottom-2 -right-2">
                <ProofOrb
                  username={profile.username}
                  totalDonated={profile.totalDonated}
                  socialEngagement={followerCount}
                  size="sm"
                />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold">{profile.displayName}</h3>
            <p className="text-sm text-gray-400 mb-2">@{profile.username}</p>

            {editingBio ? (
              <div className="space-y-2">
                <textarea
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  maxLength={280}
                  rows={2}
                  className="input resize-none !text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={saveBio} disabled={savingBio} className="btn-primary px-4 py-1.5 text-xs">
                    {savingBio ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setEditingBio(false); setNewBio(profile.bio) }} className="btn-secondary px-4 py-1.5 text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-xs text-gray-500 leading-relaxed flex-1">
                  {profile.bio || 'No bio yet'}
                </p>
                <button onClick={() => setEditingBio(true)} className="btn-ghost px-2 py-1 text-[10px] flex-shrink-0">
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-black/[0.03]">
          <div className="text-center">
            <div className="text-lg font-bold counter">{followerCount}</div>
            <div className="text-[10px] text-gray-400">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold counter">{followingCount}</div>
            <div className="text-[10px] text-gray-400">Following</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold counter">{profile.totalDonated.toFixed(2)}</div>
            <div className="text-[10px] text-gray-400">SOL Given</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold counter text-emerald-600">{profile.rewardPoints}</div>
            <div className="text-[10px] text-gray-400">Points</div>
          </div>
        </div>
      </div>

      {/* Share Impact Button */}
      <button
        onClick={() => setShowShareModal(true)}
        className="btn-primary w-full py-3 rounded-2xl text-sm font-medium mb-4 flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        Share Impact
      </button>

      {/* Share Impact Modal */}
      {showShareModal && (
        <ShareImpactModal
          username={profile.username}
          totalDonated={profile.totalDonated}
          donationCount={profile.donationCount}
          rewardPoints={profile.rewardPoints}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Impact Score */}
      <ImpactScore address={profile.address} username={profile.username} />

      {/* Donation Streak */}
      <DonationStreak address={profile.address} />

      {/* Social Graph */}
      <SocialGraph username={profile.username} />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-5">
          <p className="text-xs text-gray-400 mb-1">Donations</p>
          <p className="text-2xl font-bold counter">{profile.donationCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-400 mb-1">Tips Sent</p>
          <p className="text-2xl font-bold counter">{profile.tipCountSent}</p>
        </div>
      </div>

      {/* NFT Gallery */}
      <div className="card p-6 mb-4">
        <h3 className="font-semibold mb-4">Impact NFTs</h3>
        {nfts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🏅</p>
            <p className="text-sm text-gray-400">No impact NFTs yet</p>
            <p className="text-xs text-gray-300">Donate to earn soulbound impact certificates</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-stagger">
            {nfts.map((nft) => {
              const tier = getTierConfig(nft.tier)
              return (
                <div key={nft.id} className={`card-interactive p-4 text-center border-2 ${tier.borderColor} ${tier.bgColor}`}>
                  <span className="text-3xl">{tier.emoji}</span>
                  <p className={`text-xs font-semibold mt-2 ${tier.color}`}>{tier.label}</p>
                  <p className="text-[11px] font-medium text-gray-700 mt-1 line-clamp-1">{nft.cause_name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{nft.amount} SOL</p>
                  <p className="text-[9px] text-gray-300 mt-1">
                    {nft.created_at ? new Date(nft.created_at).toLocaleDateString() : ''}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Member Since */}
      <div className="text-center text-xs text-gray-300 py-4">
        Member since {new Date(profile.created_at).toLocaleDateString()}
      </div>
    </div>
  )
}

/* ===== Share Impact Modal ===== */

interface ShareImpactModalProps {
  username: string
  totalDonated: number
  donationCount: number
  rewardPoints: number
  onClose: () => void
}

function ShareImpactModal({ username, totalDonated, donationCount, rewardPoints, onClose }: ShareImpactModalProps) {
  const tier = getUserTierLabel(totalDonated)

  const cardUrl = useMemo(() => {
    const params = new URLSearchParams({
      username,
      totalDonated: totalDonated.toFixed(2),
      donationCount: donationCount.toString(),
      tier,
      rewardPoints: rewardPoints.toString(),
    })
    return `/api/impact-card?${params.toString()}`
  }, [username, totalDonated, donationCount, tier, rewardPoints])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = cardUrl
    link.download = `umanity-impact-${username}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShareOnX = () => {
    const text = encodeURIComponent(
      `My impact on @umanity_xyz:\n${totalDonated.toFixed(2)} SOL donated across ${donationCount} donations.\nTier: ${tier}\n\nOn-chain giving, transparent governance, real impact.\nhttps://umanity.xyz`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-fade-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-bold mb-1">Share Your Impact</h3>
        <p className="text-xs text-gray-400 mb-5">Show the world what you&apos;ve done on Umanity.</p>

        {/* Card Preview */}
        <div className="rounded-2xl overflow-hidden border border-black/[0.06] mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt={`Impact card for @${username}`}
            className="w-full h-auto"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="btn-secondary flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </button>
          <button
            onClick={handleShareOnX}
            className="btn-primary flex-[2] py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
