'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { GradientAvatar } from '@/components/shared/GradientAvatar'

interface ImpactDareProps {
  currentUsername: string | null
  onDareCreated?: () => void
}

export function ImpactDare({ currentUsername, onDareCreated }: ImpactDareProps) {
  const { publicKey } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [targetUsername, setTargetUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [poolId, setPoolId] = useState('palestine-red-crescent')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [searchResults, setSearchResults] = useState<{ username: string }[]>([])
  const [, setSearching] = useState(false)

  const POOLS = [
    { id: 'palestine-red-crescent', name: 'Palestine Red Crescent', emoji: '🏥' },
    { id: 'turkish-red-crescent', name: 'Turkish Red Crescent', emoji: '🆘' },
    { id: 'mercy-corps', name: 'Mercy Corps', emoji: '🌍' },
    { id: 'edhi-foundation', name: 'Edhi Foundation', emoji: '🤝' },
    { id: 'orphanage-aid', name: 'Orphanage Aid', emoji: '👶' },
    { id: 'animal-rescue', name: 'Animal Rescue', emoji: '🐾' },
  ]

  const searchUsers = async (query: string) => {
    setTargetUsername(query)
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/social/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSearchResults((data.profiles || data.results || []).filter((p: any) => p.username !== currentUsername).slice(0, 5))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const createDare = async () => {
    if (!currentUsername || !targetUsername || !amount || !publicKey) return
    setLoading(true)
    try {
      const pool = POOLS.find(p => p.id === poolId)
      const blinkUrl = `${window.location.origin}/api/actions/donate/${poolId}`
      const dareText = `I dare @${targetUsername} to donate ${amount} SOL to ${pool?.emoji} ${pool?.name}!\n\nDonate via Blink: ${blinkUrl}`

      // 1. Post dare to Tapestry feed
      await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          content: dareText,
          properties: {
            type: 'impact_dare',
            dareTarget: targetUsername,
            dareAmount: amount,
            darePool: poolId,
            darePoolName: pool?.name || '',
            darePoolEmoji: pool?.emoji || '',
            blinkUrl,
            contentType: 'post',
          },
        }),
      })

      // 2. Send notification to the dared user
      try {
        // Look up target user's address via register/check (searches by username in Supabase)
        const checkRes = await fetch(`/api/social/search?q=${encodeURIComponent(targetUsername)}`)
        const checkData = await checkRes.json()
        const targetProfile = (checkData.profiles || []).find(
          (p: any) => p.username === targetUsername
        )
        const targetAddress = targetProfile?.walletAddress

        if (targetAddress) {
          await fetch('/api/social/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientAddress: targetAddress,
              type: 'dare',
              message: `@${currentUsername} dared you to donate ${amount} SOL to ${pool?.emoji} ${pool?.name}!`,
              fromUsername: currentUsername,
            }),
          })
        }
      } catch {
        // Notification is non-blocking
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setIsOpen(false)
        setTargetUsername('')
        setAmount('')
        onDareCreated?.()
      }, 2000)
    } catch {
      // Error handling
    } finally {
      setLoading(false)
    }
  }

  if (!currentUsername) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full dare-card p-4 text-left transition-all hover:shadow-lg group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Impact Dare</p>
            <p className="text-xs text-gray-400">Challenge someone to match your donation</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="fixed inset-0 modal-backdrop" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-elevated p-6 w-full max-w-md animate-in max-h-[90vh] overflow-y-auto">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚡</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Dare sent!</h3>
                <p className="text-sm text-gray-400">@{targetUsername} has been challenged. Let&apos;s see if they match it.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Create Impact Dare</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Challenge someone to match your donation</p>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="btn-ghost p-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Target user */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 block">Dare who?</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">@</span>
                      <input
                        type="text"
                        value={targetUsername}
                        onChange={(e) => searchUsers(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="username"
                        className="input !pl-8"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-1 card p-1 max-h-32 overflow-y-auto">
                        {searchResults.map(u => (
                          <button
                            key={u.username}
                            onClick={() => { setTargetUsername(u.username); setSearchResults([]) }}
                            className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                          >
                            <GradientAvatar username={u.username} size="sm" />
                            <span className="text-sm">@{u.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 block">Your commitment (SOL)</label>
                    <div className="flex gap-2">
                      {['0.05', '0.1', '0.5', '1'].map(a => (
                        <button
                          key={a}
                          onClick={() => setAmount(a)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            amount === a ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pool */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 block">Cause</label>
                    <select
                      value={poolId}
                      onChange={(e) => setPoolId(e.target.value)}
                      className="input !py-3"
                    >
                      {POOLS.map(p => (
                        <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Preview */}
                  {targetUsername && amount && (
                    <div className="dare-card p-4 mt-2">
                      <p className="text-xs text-gray-500 mb-2">Preview</p>
                      <p className="text-sm text-gray-700">
                        <strong>@{currentUsername}</strong> dares <strong>@{targetUsername}</strong> to donate {amount} SOL to {POOLS.find(p => p.id === poolId)?.emoji} {POOLS.find(p => p.id === poolId)?.name}!
                      </p>
                    </div>
                  )}

                  <button
                    onClick={createDare}
                    disabled={loading || !targetUsername || !amount}
                    className="btn-gradient w-full py-4 rounded-2xl text-[15px] mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending dare...
                      </span>
                    ) : (
                      '⚡ Send Impact Dare'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
