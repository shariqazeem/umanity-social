'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { SocialProofBadge } from '@/components/shared/SocialProofBadge'

interface Pool {
  id: string
  name: string
  description: string
  totalDonated: number
  donorCount: number
}

const POOL_META: Record<string, { emoji: string; wallet: string; category: string; color: string }> = {
  medical: { emoji: '🏥', wallet: 'BAScBKuDXCqdHxcoqdaDrUyJtFVtjBM5wS8tLd6tsgpy', category: 'Healthcare', color: 'bg-red-50 text-red-600' },
  education: { emoji: '📚', wallet: 'BAScBKuDXCqdHxcoqdaDrUyJtFVtjBM5wS8tLd6tsgpy', category: 'Education', color: 'bg-blue-50 text-blue-600' },
  disaster: { emoji: '🆘', wallet: 'BAScBKuDXCqdHxcoqdaDrUyJtFVtjBM5wS8tLd6tsgpy', category: 'Emergency', color: 'bg-orange-50 text-orange-600' },
  water: { emoji: '💧', wallet: 'BAScBKuDXCqdHxcoqdaDrUyJtFVtjBM5wS8tLd6tsgpy', category: 'Infrastructure', color: 'bg-cyan-50 text-cyan-600' },
}

export function DonationPools() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [pools, setPools] = useState<Pool[]>([])
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [txSignature, setTxSignature] = useState('')
  const [socialProof, setSocialProof] = useState<Record<string, string[]>>({})
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)

  useEffect(() => {
    fetchPools()
    if (publicKey) fetchCurrentUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const fetchCurrentUser = async () => {
    if (!publicKey) return
    try {
      const res = await fetch(`/api/register/check?address=${publicKey.toBase58()}`)
      const data = await res.json()
      if (data.registered && data.user) {
        setCurrentUsername(data.user.username)
        // Fetch social proof for pools once we have username
        fetchSocialProof(data.user.username)
      }
    } catch {
      // Not registered
    }
  }

  const fetchSocialProof = async (username: string) => {
    const poolIds = ['medical', 'education', 'disaster', 'water']
    for (const poolId of poolIds) {
      try {
        const res = await fetch(`/api/social-proof?username=${username}&poolId=${poolId}`)
        const data = await res.json()
        if (data.matchedUsernames?.length > 0) {
          setSocialProof(prev => ({ ...prev, [poolId]: data.matchedUsernames }))
        }
      } catch {
        // No social proof for this pool
      }
    }
  }

  const fetchPools = async () => {
    try {
      const response = await fetch('/api/pools')
      const data = await response.json()
      setPools(data.pools || [])
    } catch (error) {
      console.error('Error fetching pools:', error)
      setPools([])
    }
  }

  const donate = async () => {
    if (!publicKey || !selectedPool || !amount) return
    const solAmount = parseFloat(amount)
    if (solAmount < 0.001) return

    setLoading(true)
    setTxSignature('')

    try {
      const lamports = solAmount * LAMPORTS_PER_SOL
      const meta = POOL_META[selectedPool.id]
      const poolWallet = new PublicKey(meta?.wallet || 'BAScBKuDXCqdHxcoqdaDrUyJtFVtjBM5wS8tLd6tsgpy')

      const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: poolWallet, lamports })
      )

      const signature = await sendTransaction(transaction, connection)
      setTxSignature(signature)

      const latestBlockhash = await connection.getLatestBlockhash()
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed')

      try {
        await fetch('/api/pools/donate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donor: publicKey.toBase58(),
            pool: selectedPool.id,
            poolName: selectedPool.name,
            amount: solAmount,
            signature,
          }),
        })
      } catch (apiError) {
        console.error('Failed to record donation:', apiError)
      }

      setTimeout(() => {
        setSelectedPool(null)
        setAmount('')
        setTxSignature('')
        fetchPools()
      }, 3000)
    } catch (error: any) {
      console.error('Donation error:', error)
      setTxSignature('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Causes</h3>
          <p className="text-sm text-gray-400 mt-0.5">Support verified causes</p>
        </div>
        <span className="pill bg-gray-100 text-gray-500">{pools.length} active</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-stagger">
        {pools.map((pool) => {
          const meta = POOL_META[pool.id]
          if (!meta) return null
          return (
            <div key={pool.id} className="card-interactive p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl">
                  {meta.emoji}
                </div>
                <span className={`pill ${meta.color} text-[10px]`}>{meta.category}</span>
              </div>
              <h4 className="font-semibold mb-1">{pool.name}</h4>
              <p className="text-xs text-gray-400 mb-5 line-clamp-2">{pool.description}</p>
              {socialProof[pool.id] && socialProof[pool.id].length > 0 && (
                <div className="mb-4">
                  <SocialProofBadge usernames={socialProof[pool.id]} action="donated" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold counter">{pool.totalDonated.toFixed(3)}</span>
                  <span className="text-xs text-gray-400 ml-1">SOL</span>
                  <span className="text-xs text-gray-300 mx-1.5">·</span>
                  <span className="text-xs text-gray-400">{pool.donorCount} donors</span>
                </div>
                <button
                  onClick={() => setSelectedPool(pool)}
                  disabled={!publicKey}
                  className="btn-primary py-2 px-5 text-xs"
                >
                  Donate
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Donate Modal */}
      {selectedPool && (() => {
        const meta = POOL_META[selectedPool.id]
        if (!meta) return null
        return (
          <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-5">
            <div className="bg-white rounded-3xl max-w-md w-full p-7 animate-in">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">
                    {meta.emoji}
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedPool.name}</h3>
                    <p className="text-[11px] text-gray-400">{meta.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedPool(null); setTxSignature('') }}
                  className="btn-ghost w-8 h-8 flex items-center justify-center text-lg"
                >
                  &times;
                </button>
              </div>

              {txSignature && (
                <div className="bg-emerald-50 rounded-2xl p-4 mb-5 flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-emerald-700">Confirmed</p>
                    <a href={`https://solscan.io/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline">
                      View on Solscan
                    </a>
                  </div>
                </div>
              )}

              <div className="mb-5">
                <label className="text-xs font-medium text-gray-500 mb-2 block">Amount (SOL)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  step="0.01"
                  min="0.001"
                  className="input"
                />
                <div className="flex gap-2 mt-3">
                  {['0.01', '0.05', '0.1', '0.5'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className="btn-secondary flex-1 py-2.5 text-xs"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={donate}
                disabled={loading || !amount || parseFloat(amount) < 0.001}
                className="btn-primary w-full py-3.5 text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Confirming...
                  </span>
                ) : (
                  `Donate ${amount || '0'} SOL`
                )}
              </button>
            </div>
          </div>
        )
      })()}
    </section>
  )
}
