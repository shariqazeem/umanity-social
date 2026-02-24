'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { GradientAvatar } from '@/components/shared/GradientAvatar'
import { ImpactScore } from './ImpactScore'

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
  donationType: string
  amount: number
  createdAt: string
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

  const TIER_EMOJI: Record<string, string> = {
    bronze: '🥉', silver: '🥈', gold: '🥇', diamond: '💎'
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 pt-2">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Profile</h2>
        <p className="text-gray-400 text-sm">Your impact resume.</p>
      </div>

      {/* Profile Header Card */}
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-4">
          <GradientAvatar username={profile.username} size="xl" />
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

        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-black/[0.03]">
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

      {/* Impact Score */}
      <ImpactScore address={profile.address} username={profile.username} />

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
            {nfts.map((nft) => (
              <div key={nft.id} className="card-interactive p-4 text-center">
                <span className="text-3xl">{TIER_EMOJI[nft.tier] || '🏅'}</span>
                <p className="text-xs font-semibold mt-2 capitalize">{nft.tier}</p>
                <p className="text-[10px] text-gray-400">{nft.amount} SOL · {nft.donationType}</p>
              </div>
            ))}
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
