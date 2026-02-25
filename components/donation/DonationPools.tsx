'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { getDonationsProgram, findPoolPDA, findVaultPDA } from '@/lib/anchor'
import { POOL_META, POOL_SEEDS, POOL_RECIPIENTS, UMANITY_ORG_WALLET } from '@/lib/constants'
import { SocialProofBadge } from '@/components/shared/SocialProofBadge'
import { MilestoneProgress } from '@/components/campaign/MilestoneProgress'

interface Pool {
  id: string
  name: string
  description: string
  totalDonated: number
  donorCount: number
}

// Fallback pool data matching on-chain pools (seed data for empty state)
const FALLBACK_POOLS: Pool[] = [
  { id: 'palestine-red-crescent', name: 'Palestine Red Crescent Society', description: 'Medical aid & emergency relief for civilians in Palestine via PRCS', totalDonated: 0, donorCount: 0 },
  { id: 'turkish-red-crescent', name: 'Turkish Red Crescent (Kizilay)', description: 'Earthquake recovery & disaster relief via Turkish Red Crescent', totalDonated: 0, donorCount: 0 },
  { id: 'mercy-corps', name: 'Mercy Corps', description: 'Clean water, food security & crisis response worldwide', totalDonated: 0, donorCount: 0 },
  { id: 'edhi-foundation', name: 'Edhi Foundation', description: 'Healthcare, orphan care & emergency services via Edhi Foundation Pakistan', totalDonated: 0, donorCount: 0 },
  { id: 'orphanage-aid', name: 'Local Orphanage Aid', description: 'Supplies, education & care for local orphanages — Umanity delivers personally', totalDonated: 0, donorCount: 0 },
  { id: 'animal-rescue', name: 'Street Animal Rescue', description: 'Rescue, shelter & medical care for street animals — Umanity delivers personally', totalDonated: 0, donorCount: 0 },
]

export function DonationPools() {
  const wallet = useWallet()
  const { publicKey } = wallet
  const { connection } = useConnection()
  const [pools, setPools] = useState<Pool[]>([])
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [txSignature, setTxSignature] = useState('')
  const [optimisticSuccess, setOptimisticSuccess] = useState(false)
  const [socialProof, setSocialProof] = useState<Record<string, string[]>>({})
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Record<string, { id: string; target_amount: number; total_raised: number }>>({})


  useEffect(() => {
    fetchPools()
    fetchCampaigns()
    if (publicKey) fetchCurrentUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      if (data.campaigns) {
        const map: Record<string, { id: string; target_amount: number; total_raised: number }> = {}
        for (const c of data.campaigns) {
          map[c.pool_id] = { id: c.id, target_amount: c.target_amount, total_raised: c.total_raised }
        }
        setCampaigns(map)
      }
    } catch {
      // No campaigns
    }
  }

  const fetchCurrentUser = async () => {
    if (!publicKey) return
    try {
      const res = await fetch(`/api/register/check?address=${publicKey.toBase58()}`)
      const data = await res.json()
      if (data.registered && data.user) {
        setCurrentUsername(data.user.username)
        fetchSocialProof(data.user.username)
      }
    } catch {
      // Not registered
    }
  }

  const fetchSocialProof = async (username: string) => {
    const poolIds = Object.keys(POOL_SEEDS)
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
      const fetched = (data.pools || []) as Pool[]
      // Build a map of fetched pools that match our pool IDs
      const fetchedMap = new Map<string, Pool>()
      for (const p of fetched) {
        if (POOL_META[p.id]) fetchedMap.set(p.id, p)
      }
      // Merge: use API data where available, fallback data for the rest
      const merged = FALLBACK_POOLS.map(fb => fetchedMap.get(fb.id) || fb)
      setPools(merged)
    } catch (error) {
      console.error('Error fetching pools:', error)
      setPools(FALLBACK_POOLS)
    }
  }

  const donate = async () => {
    if (!publicKey || !selectedPool || !amount || !wallet.wallet) return
    const solAmount = parseFloat(amount)
    if (solAmount < 0.001) return

    setLoading(true)
    setTxSignature('')
    setOptimisticSuccess(false)

    try {
      const poolSeed = POOL_SEEDS[selectedPool.id]
      if (!poolSeed) throw new Error('Unknown pool')

      const anchorWallet = wallet as any
      const program = getDonationsProgram(connection, anchorWallet)

      // Derive PDAs
      const [poolPDA] = findPoolPDA(poolSeed)
      const [vaultPDA] = findVaultPDA(poolPDA)

      // Create donation record keypair
      const donationRecord = Keypair.generate()
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL)

      // Call Anchor donate_to_pool instruction
      const signature = await (program.methods as any)
        .donateToPool(new BN(lamports))
        .accounts({
          pool: poolPDA,
          poolVault: vaultPDA,
          donationRecord: donationRecord.publicKey,
          donor: publicKey,
          systemProgram: '11111111111111111111111111111111',
        })
        .signers([donationRecord])
        .rpc()

      setTxSignature(signature)

      // Optimistic UI: show success immediately
      setOptimisticSuccess(true)

      // Optimistically update pool stats locally
      setPools(prev => prev.map(p =>
        p.id === selectedPool.id
          ? { ...p, totalDonated: p.totalDonated + solAmount, donorCount: p.donorCount + 1 }
          : p
      ))

      // Sync to backend
      try {
        await fetch('/api/donate/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donor: publicKey.toBase58(),
            amount: solAmount,
            signature,
            pool: selectedPool.id,
            poolName: selectedPool.name,
            type: 'pool',
          }),
        })
      } catch (apiError) {
        console.error('Failed to sync donation:', apiError)
      }

      setTimeout(() => {
        setSelectedPool(null)
        setAmount('')
        setTxSignature('')
        setOptimisticSuccess(false)
        fetchPools()
      }, 3000)
    } catch (error: any) {
      console.error('Donation error:', error)
      setTxSignature('')
      setOptimisticSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Causes</h3>
          <p className="text-sm text-gray-400 mt-0.5">Support verified on-chain causes</p>
        </div>
        <span className="pill bg-gray-100 text-gray-500">{pools.length} active</span>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
            {'🤝'}
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-800 mb-1">How Umanity delivers impact</p>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              All donated funds are held on-chain and released via community governance votes.
              Umanity Org receives approved funds and physically delivers to verified charities.
              Every delivery is documented with proof posted on{' '}
              <a href="https://x.com/umanity_xyz" target="_blank" rel="noopener noreferrer" className="font-semibold underline">@umanity_xyz</a>.
            </p>
          </div>
        </div>
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
              <p className="text-xs text-gray-400 mb-2 line-clamp-2">{pool.description}</p>
              {POOL_RECIPIENTS[pool.id] && (
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-[10px] text-gray-400">Via Umanity Org </span>
                  <a
                    href={`https://solscan.io/account/${POOL_RECIPIENTS[pool.id].address}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 hover:underline font-mono"
                  >
                    {POOL_RECIPIENTS[pool.id].address.slice(0, 4)}...{POOL_RECIPIENTS[pool.id].address.slice(-4)}
                  </a>
                  <span className="text-[10px] text-gray-300">{'·'} Proof on X</span>
                </div>
              )}
              {socialProof[pool.id] && socialProof[pool.id].length > 0 && (
                <div className="mb-4">
                  <SocialProofBadge usernames={socialProof[pool.id]} action="donated" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold counter">{pool.totalDonated.toFixed(3)}</span>
                  <span className="text-xs text-gray-400 ml-1">SOL</span>
                  <span className="text-xs text-gray-300 mx-1.5">{'\u00B7'}</span>
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
              {campaigns[pool.id] && (
                <MilestoneProgress
                  campaignId={campaigns[pool.id].id}
                  totalRaised={campaigns[pool.id].total_raised}
                  targetAmount={campaigns[pool.id].target_amount}
                />
              )}
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
                  onClick={() => { setSelectedPool(null); setTxSignature(''); setOptimisticSuccess(false) }}
                  className="btn-ghost w-8 h-8 flex items-center justify-center text-lg"
                >
                  &times;
                </button>
              </div>

              {(txSignature || optimisticSuccess) && (
                <div className="bg-emerald-50 rounded-2xl p-4 mb-5 flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-emerald-700">Donation submitted!</p>
                    <div className="flex items-center gap-3">
                      {txSignature && (
                        <a href={`https://solscan.io/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline">
                          View on Solscan
                        </a>
                      )}
                      <a
                        href={`https://x.com/intent/tweet?text=${encodeURIComponent(`Just donated ${amount} SOL to ${selectedPool.name} on @umanity_xyz! On-chain, transparent, community-governed.\n\nhttps://umanity.xyz`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 underline font-medium"
                      >
                        Share on X
                      </a>
                    </div>
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
