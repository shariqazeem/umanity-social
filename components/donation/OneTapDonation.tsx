'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Keypair } from '@solana/web3.js'
import { getDonationsProgram, findPoolPDA, findVaultPDA } from '@/lib/anchor'
import { PLATFORM_CONFIG, DEFAULT_ONE_TAP_POOL } from '@/lib/constants'

interface DonationStats {
  totalDonations: number
  totalDonors: number
  totalRewardsDistributed: number
  pendingDistribution: number
}

export function OneTapDonation() {
  const wallet = useWallet()
  const { publicKey } = wallet
  const { connection } = useConnection()
  const [status, setStatus] = useState<'idle' | 'processing' | 'confirming' | 'success' | 'error'>('idle')
  const [txSignature, setTxSignature] = useState('')
  const [error, setError] = useState('')
  const [rewardPoints, setRewardPoints] = useState(0)
  const [stats, setStats] = useState<DonationStats>({
    totalDonations: 0,
    totalDonors: 0,
    totalRewardsDistributed: 0,
    pendingDistribution: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/platform/stats')
      const data = await response.json()
      if (data.stats) setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const donate = async () => {
    if (!publicKey || !wallet.wallet) {
      setError('Connect your wallet first')
      setStatus('error')
      setTimeout(() => { setStatus('idle'); setError('') }, 3000)
      return
    }

    setStatus('processing')
    setError('')

    try {
      const anchorWallet = wallet as any
      const program = getDonationsProgram(connection, anchorWallet)

      // Derive PDAs for the default one-tap pool
      const [poolPDA] = findPoolPDA(DEFAULT_ONE_TAP_POOL)
      const [vaultPDA] = findVaultPDA(poolPDA)

      // Create a new keypair for the donation record
      const donationRecord = Keypair.generate()

      // Call the on-chain one_tap_donate instruction
      const signature = await (program.methods as any)
        .oneTapDonate()
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

      // Optimistic UI: show points immediately
      const points = Math.floor(0.01 * PLATFORM_CONFIG.POINTS_PER_SOL)
      setRewardPoints(points)
      setStatus('confirming')

      // Sync to backend (Supabase + milestones)
      try {
        const response = await fetch('/api/donate/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donor: publicKey.toBase58(),
            amount: 0.01,
            signature,
            pool: DEFAULT_ONE_TAP_POOL,
            poolName: 'Palestine Red Crescent Society',
            type: 'one-tap',
          }),
        })
        const data = await response.json()
        if (data.rewardPoints) setRewardPoints(data.rewardPoints)
      } catch (apiError) {
        console.error('Failed to sync donation:', apiError)
      }

      setStatus('success')
      fetchStats()
      setTimeout(() => { setStatus('idle'); setTxSignature(''); setRewardPoints(0) }, 5000)
    } catch (error: any) {
      console.error('Donation error:', error)
      setError(error.message || 'Transaction failed')
      setStatus('error')
      setTimeout(() => { setStatus('idle'); setError('') }, 4000)
    }
  }

  return (
    <section>
      <div className="card relative overflow-hidden">
        {/* Success overlay */}
        {(status === 'success' || status === 'confirming') && (
          <div className="absolute inset-0 bg-[#111] flex flex-col items-center justify-center z-10 animate-in">
            <div className="w-14 h-14 rounded-full border-2 border-white/20 flex items-center justify-center mb-4">
              {status === 'confirming' ? (
                <svg className="animate-spin h-7 w-7 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <p className="text-white text-lg font-semibold mb-1">
              {status === 'confirming' ? 'Confirming...' : 'Donation confirmed'}
            </p>
            <p className="text-white/50 text-sm mb-4">+{rewardPoints} reward points</p>
            <div className="flex items-center gap-4">
              {txSignature && (
                <a
                  href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 text-xs underline hover:text-white/60 transition-colors"
                >
                  View on Solscan
                </a>
              )}
              <a
                href={`https://x.com/intent/tweet?text=${encodeURIComponent('Just donated 0.01 SOL to Palestine Red Crescent on @umanity_xyz with one tap! On-chain giving made easy.\n\nhttps://umanity.xyz')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 text-xs underline hover:text-white/60 transition-colors font-medium"
              >
                Share on X
              </a>
            </div>
          </div>
        )}

        <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-10">
          {/* Left */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-widest mb-3">One-tap giving</p>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              0.01 SOL
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Instant on-chain donation via Anchor program.
              <br />
              Earn 10 reward points every time.
            </p>

            <div className="flex gap-8 justify-center md:justify-start">
              <div>
                <div className="text-2xl font-bold counter">{stats.totalDonations.toFixed(2)}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">SOL raised</div>
              </div>
              <div>
                <div className="text-2xl font-bold counter">{stats.totalDonors}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Donors</div>
              </div>
              <div>
                <div className="text-2xl font-bold counter">{stats.totalRewardsDistributed}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Points given</div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col items-center gap-5">
            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            <button
              onClick={donate}
              disabled={status === 'processing' || status === 'confirming' || !publicKey}
              className="btn-primary w-48 h-48 !rounded-full text-base flex flex-col items-center justify-center gap-1 hover:!shadow-2xl hover:!shadow-black/20"
            >
              {status === 'processing' ? (
                <span className="flex flex-col items-center gap-2">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm">Signing</span>
                </span>
              ) : (
                <>
                  <span className="text-2xl mb-1">{'\u2661'}</span>
                  <span className="font-semibold">Donate</span>
                  <span className="text-xs text-white/50">0.01 SOL</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span>On-chain</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>Anchor</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>Verified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
