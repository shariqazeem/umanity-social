'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/wallet/WalletButton'
import { DonationPools } from '@/components/donation/DonationPools'
import { OneTapDonation } from '@/components/donation/OneTapDonation'
import { TippingSystem } from '@/components/tips/TippingSystem'
import { Leaderboard } from '@/components/leaderboard/Leaderboard'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { SmartFeed } from '@/components/feed/SmartFeed'
import { ExplorePage } from '@/components/explore/ExplorePage'
import { ProfilePage } from '@/components/profile/ProfilePage'
import { GovernancePanel } from '@/components/governance/GovernancePanel'
import { GradientAvatar } from '@/components/shared/GradientAvatar'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { UmanityAgent } from '@/components/ai/UmanityAgent'

const TABS = [
  { id: 'feed' as const, label: 'Feed', icon: '◎' },
  { id: 'explore' as const, label: 'Explore', icon: '◈' },
  { id: 'donate' as const, label: 'Donate', icon: '♡' },
  { id: 'govern' as const, label: 'Govern', icon: '⬡' },
  { id: 'profile' as const, label: 'Profile', icon: '◆' },
] as const

type TabId = typeof TABS[number]['id']

export default function Home() {
  const { publicKey } = useWallet()
  const [activeTab, setActiveTab] = useState<TabId>('feed')
  const [isRegistered, setIsRegistered] = useState(false)
  const [registeredUsername, setRegisteredUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [referrer, setReferrer] = useState('')

  const checkRegistration = useCallback(async () => {
    if (!publicKey) return
    setChecking(true)
    try {
      const res = await fetch(`/api/register/check?address=${publicKey.toBase58()}`)
      const data = await res.json()
      setIsRegistered(data.registered)
      if (data.registered && data.user?.username) {
        setRegisteredUsername(data.user.username)
      }
      if (!data.registered) {
        setShowOnboarding(true)
      }
    } catch {
      setShowOnboarding(true)
    } finally {
      setChecking(false)
    }
  }, [publicKey])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) setReferrer(ref)
  }, [])

  useEffect(() => {
    if (publicKey) {
      checkRegistration()
    } else {
      setIsRegistered(false)
      setRegisteredUsername('')
      setShowOnboarding(false)
      setChecking(false)
    }
  }, [publicKey, checkRegistration])

  /* ======== LANDING PAGE ======== */
  if (!publicKey) {
    return <LandingPage />
  }

  /* ======== CHECKING STATE ======== */
  if (checking) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center animate-fade-up">
          <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-sm font-black">U</span>
          </div>
          <div className="w-6 h-6 border-2 border-gray-200 border-t-[#111] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  /* ======== ONBOARDING ======== */
  if (showOnboarding && !isRegistered) {
    return <OnboardingScreen
      onComplete={() => { setIsRegistered(true); setShowOnboarding(false) }}
      referrer={referrer}
    />
  }

  /* ======== MAIN APP ======== */
  return (
    <div className="min-h-screen page-bg">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-black/[0.03]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#111] flex items-center justify-center">
                <span className="text-white text-xs font-black">U</span>
              </div>
              <span className="text-[15px] font-semibold tracking-tight">Umanity</span>
            </div>
            <nav className="hidden md:flex items-center">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-4 text-[13px] font-medium transition-colors ${
                    activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-gray-900 rounded-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-400">
              <div className="pulse-dot" />
              Devnet
            </div>
            {publicKey && isRegistered && registeredUsername && (
              <NotificationBell
                address={publicKey.toBase58()}
                username={registeredUsername}
              />
            )}
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/[0.04] safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all ${
                activeTab === tab.id ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <span className={`text-base transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 pb-28 md:pb-12">
        <div className="animate-fade-up">
          {activeTab === 'feed' && <SmartFeed />}
          {activeTab === 'explore' && <ExplorePage />}
          {activeTab === 'donate' && <DonateView />}
          {activeTab === 'govern' && <GovernancePanel />}
          {activeTab === 'profile' && <ProfilePage />}
        </div>
      </main>

      <UmanityAgent />
    </div>
  )
}

/* ===== LANDING PAGE ===== */
function LandingPage() {
  return (
    <div className="min-h-screen page-bg overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-black/[0.03]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#111] flex items-center justify-center">
              <span className="text-white text-xs font-black">U</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Umanity</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-400">
              <div className="pulse-dot" />
              Solana Devnet
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="relative">
        <div className="max-w-6xl mx-auto px-6 pt-40 pb-24">
          <div className="max-w-4xl animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-black/[0.04] text-[11px] font-medium text-gray-400 mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Solana Graveyard Hackathon · Resurrecting Purpose
            </div>

            <h1 className="text-[clamp(3rem,8vw,6.5rem)] font-bold tracking-[-0.04em] leading-[0.9] mb-8 text-gray-900">
              The social
              <br />
              impact network
              <br />
              <span className="text-gray-200">on Solana.</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 max-w-xl leading-relaxed mb-14 font-light">
              Where philanthropy IS the content. Your feed shows what your network is doing. Social proof drives giving.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <WalletButton />
              <div className="flex items-center gap-6 text-[12px] text-gray-300 pt-3">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Non-custodial
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Instant
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Transparent
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-stagger">
            {[
              {
                num: '01',
                title: 'Social-First Feed',
                desc: 'Your feed shows what your network is doing. Donations, votes, and stories from people you follow. Social proof drives impact.',
                tag: '\u2726 Tapestry Protocol',
              },
              {
                num: '02',
                title: 'DAO Governance',
                desc: 'Your donations earn reward points. Points become voting power. Community votes control when escrowed funds are released on-chain.',
                tag: 'Anchor Escrow',
              },
              {
                num: '03',
                title: 'Impact NFTs',
                desc: 'Soulbound, non-transferable proof you made a difference. Tiered certificates from Bronze to Diamond.',
                tag: 'Impact Proof',
              },
            ].map((f) => (
              <div key={f.num} className="card p-8 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[11px] font-mono text-gray-300">{f.num}</span>
                  <span className="text-[10px] font-medium text-gray-400 px-2.5 py-1 rounded-full border border-black/[0.05]">{f.tag}</span>
                </div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-black/[0.04] py-16 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-gray-400 text-sm">Built with</p>
              <div className="flex items-center gap-6 mt-2 text-[13px] text-gray-300">
                <span>Solana</span>
                <span>Tapestry</span>
                <span>Anchor</span>
                <span>Supabase</span>
              </div>
            </div>
            <WalletButton />
          </div>
        </div>
      </main>
    </div>
  )
}

/* ===== 4-STEP ONBOARDING ===== */
function OnboardingScreen({ onComplete, referrer }: { onComplete: () => void; referrer?: string }) {
  const { publicKey, disconnect } = useWallet()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Step 2: Suggested follows
  const [suggestedProfiles, setSuggestedProfiles] = useState<{ username: string; bio?: string }[]>([])
  const [selectedFollows, setSelectedFollows] = useState<Set<string>>(new Set())
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const TOTAL_STEPS = 4 // 0: Welcome, 1: Identity, 2: Follow suggestions, 3: Bio + Preview

  const goTo = (next: number) => {
    if (animating) return
    setDirection(next > step ? 'forward' : 'back')
    setAnimating(true)

    if (contentRef.current) {
      contentRef.current.style.opacity = '0'
      contentRef.current.style.transform = next > step ? 'translateX(-20px)' : 'translateX(20px)'
    }

    setTimeout(() => {
      setStep(next)
      if (contentRef.current) {
        contentRef.current.style.transform = direction === 'forward' ? 'translateX(20px)' : 'translateX(-20px)'
      }
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.style.opacity = '1'
          contentRef.current.style.transform = 'translateX(0)'
        }
        setTimeout(() => setAnimating(false), 300)
      })
    }, 200)
  }

  // Fetch suggested profiles when entering step 2
  const fetchSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const res = await fetch(`/api/social/suggested?username=${username}`)
      const data = await res.json()
      setSuggestedProfiles(data.profiles?.slice(0, 8) || [])
    } catch {
      // No suggestions available
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const toggleFollow = (u: string) => {
    setSelectedFollows(prev => {
      const next = new Set(prev)
      if (next.has(u)) next.delete(u)
      else next.add(u)
      return next
    })
  }

  const selectAll = () => {
    if (selectedFollows.size === suggestedProfiles.length) {
      setSelectedFollows(new Set())
    } else {
      setSelectedFollows(new Set(suggestedProfiles.map(p => p.username)))
    }
  }

  const register = async () => {
    if (!publicKey || !username || !displayName) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: publicKey.toBase58(),
          username: username.toLowerCase(),
          displayName,
          bio,
          referredBy: referrer,
        }),
      })
      const data = await response.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      if (data.success) {
        // Follow selected profiles
        for (const followee of selectedFollows) {
          try {
            await fetch('/api/social/follow', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ follower: username.toLowerCase(), followee }),
            })
          } catch {
            // Non-blocking follow error
          }
        }

        // Note: "Joined Umanity" post is created by /api/register route — no duplicate here
        setShowSuccess(true)
        setTimeout(() => onComplete(), 2000)
      }
    } catch {
      setError('Registration failed. Please try again.')
      setLoading(false)
    }
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center px-6">
        <div className="text-center onboarding-success">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 onboarding-success-icon">
            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">You&apos;re in</h2>
          <p className="text-gray-400 text-sm mb-3">Welcome to Umanity, @{username}</p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-gray-300">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              +50 points
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Tapestry profile
            </span>
            {selectedFollows.size > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {selectedFollows.size} following
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const walletPreview = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : ''

  return (
    <div className="min-h-screen page-bg flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#111] flex items-center justify-center">
            <span className="text-white text-xs font-black">U</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-gray-900">Umanity</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="text-[12px] text-gray-300 hover:text-gray-500 transition-colors"
        >
          Disconnect
        </button>
      </header>

      {/* Progress bar — 4 segments */}
      <div className="px-6 max-w-lg mx-auto w-full">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, s) => (
            <div key={s} className="h-[3px] flex-1 rounded-full overflow-hidden bg-gray-100">
              <div
                className="h-full rounded-full bg-[#111] transition-all duration-500 ease-out"
                style={{ width: s <= step ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div
          ref={contentRef}
          className="max-w-lg w-full"
          style={{ transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >

          {/* ===== STEP 0: WELCOME ===== */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-gray-50 border border-black/[0.04] flex items-center justify-center mx-auto mb-8 onboarding-float">
                <div className="w-10 h-10 rounded-xl bg-[#111] flex items-center justify-center">
                  <span className="text-white text-lg font-black">U</span>
                </div>
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-3">Welcome to Umanity</h2>
              <p className="text-gray-400 leading-relaxed mb-2 max-w-sm mx-auto">
                The social impact network on Solana.
                Your donations become stories. Your network drives giving.
              </p>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 text-[11px] text-gray-400 mt-2 mb-10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Connected: {walletPreview}
              </div>
              {referrer && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-[11px] text-emerald-600 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Referred by @{referrer}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-10 animate-stagger">
                {[
                  { icon: '◎', label: 'Social Feed', sub: 'Tapestry Protocol' },
                  { icon: '⬡', label: 'DAO Voting', sub: 'Anchor Escrow' },
                  { icon: '◆', label: 'Impact NFTs', sub: 'Impact Proof' },
                ].map((f) => (
                  <div key={f.label} className="card p-4 text-center">
                    <div className="text-xl mb-2">{f.icon}</div>
                    <div className="text-[12px] font-semibold text-gray-900">{f.label}</div>
                    <div className="text-[10px] text-gray-300 mt-0.5">{f.sub}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => goTo(1)}
                className="btn-primary w-full py-4 text-[15px] rounded-2xl"
              >
                Get started
              </button>

              <p className="text-[11px] text-gray-300 mt-4">Takes less than 30 seconds</p>
            </div>
          )}

          {/* ===== STEP 1: IDENTITY ===== */}
          {step === 1 && (
            <div>
              <p className="text-[11px] text-gray-300 uppercase tracking-widest mb-3 font-medium">Step 1 of 3</p>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Choose your identity</h2>
              <p className="text-gray-400 text-sm mb-8">This is how others will find and recognize you on Umanity.</p>

              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 block">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="satoshi"
                      maxLength={30}
                      autoFocus
                      className="input !pl-9"
                    />
                  </div>
                  {username.length > 0 && username.length < 3 && (
                    <p className="text-[11px] text-amber-500 mt-1.5">At least 3 characters</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 block">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Satoshi Nakamoto"
                    maxLength={50}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-10">
                <button
                  onClick={() => goTo(0)}
                  className="btn-secondary flex-1 py-3.5 rounded-2xl"
                >
                  Back
                </button>
                <button
                  onClick={() => { goTo(2); fetchSuggestions() }}
                  disabled={!username || !displayName || username.length < 3}
                  className="btn-primary flex-[2] py-3.5 rounded-2xl"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 2: FOLLOW SUGGESTED IMPACT MAKERS (NEW) ===== */}
          {step === 2 && (
            <div>
              <p className="text-[11px] text-gray-300 uppercase tracking-widest mb-3 font-medium">Step 2 of 3</p>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Follow impact makers</h2>
              <p className="text-gray-400 text-sm mb-6">See their donations and stories in your feed.</p>

              {loadingSuggestions ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16" />)}
                </div>
              ) : suggestedProfiles.length > 0 ? (
                <>
                  <div className="flex justify-end mb-3">
                    <button onClick={selectAll} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                      {selectedFollows.size === suggestedProfiles.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {suggestedProfiles.map((profile) => (
                      <button
                        key={profile.username}
                        onClick={() => toggleFollow(profile.username)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all border-2 ${
                          selectedFollows.has(profile.username)
                            ? 'border-[#111] bg-gray-50'
                            : 'border-transparent bg-white hover:bg-gray-50'
                        }`}
                      >
                        <GradientAvatar username={profile.username} size="lg" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium">@{profile.username}</p>
                          {profile.bio && <p className="text-xs text-gray-400 truncate">{profile.bio}</p>}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedFollows.has(profile.username)
                            ? 'border-[#111] bg-[#111]'
                            : 'border-gray-200'
                        }`}>
                          {selectedFollows.has(profile.username) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="card p-8 text-center mb-4">
                  <p className="text-gray-400 text-sm">No suggestions yet — you&apos;ll discover people in the Explore tab!</p>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => goTo(1)}
                  className="btn-secondary flex-1 py-3.5 rounded-2xl"
                >
                  Back
                </button>
                <button
                  onClick={() => goTo(3)}
                  className="btn-primary flex-[2] py-3.5 rounded-2xl"
                >
                  {selectedFollows.size > 0 ? `Follow ${selectedFollows.size} & Continue` : 'Skip'}
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 3: BIO + PREVIEW ===== */}
          {step === 3 && (
            <div>
              <p className="text-[11px] text-gray-300 uppercase tracking-widest mb-3 font-medium">Step 3 of 3</p>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Almost there</h2>
              <p className="text-gray-400 text-sm mb-8">Add a bio and review your profile before going live.</p>

              <div className="card p-5 mb-6">
                <div className="flex items-center gap-4">
                  <GradientAvatar username={username} size="xl" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{displayName}</p>
                    <p className="text-[13px] text-gray-400">@{username}</p>
                  </div>
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <div className="text-sm font-bold counter text-gray-900">0</div>
                      <div className="text-[9px] text-gray-300 uppercase tracking-wider">Followers</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold counter text-emerald-600">50</div>
                      <div className="text-[9px] text-gray-300 uppercase tracking-wider">Points</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 block">Bio (optional)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What drives you to make an impact?"
                  maxLength={280}
                  rows={3}
                  autoFocus
                  className="input resize-none"
                />
                <p className="text-[10px] text-gray-300 mt-1.5 text-right">{bio.length}/280</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mt-4">
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => goTo(2)}
                  disabled={loading}
                  className="btn-secondary flex-1 py-3.5 rounded-2xl"
                >
                  Back
                </button>
                <button
                  onClick={register}
                  disabled={loading}
                  className="btn-primary flex-[2] py-3.5 rounded-2xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating profile...
                    </span>
                  ) : (
                    'Create profile'
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-gray-300 mt-5">
                <span>+50 welcome points</span>
                <span className="text-gray-200">·</span>
                <span>Tapestry social profile</span>
                <span className="text-gray-200">·</span>
                <span>Impact NFT eligible</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ===== DONATE TAB ===== */
function DonateView() {
  return (
    <div className="space-y-10">
      <section className="pt-4 pb-2">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-2">
          Make an impact.
        </h2>
        <p className="text-gray-400">
          Every donation earns points, creates social posts, and mints proof-of-impact NFTs.
        </p>
      </section>

      <OneTapDonation />
      <DonationPools />
      <TippingSystem />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Leaderboard />
        <ActivityFeed />
      </section>
    </div>
  )
}
