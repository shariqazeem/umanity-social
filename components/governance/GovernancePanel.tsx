'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { ProposalCard } from './ProposalCard'
import { CreateProposal } from './CreateProposal'

interface Proposal {
  id: string
  creator_address: string
  title: string
  description: string
  options: string[]
  status: string
  total_votes: number
  created_at: string
  closes_at: string
  results?: { option: string; index: number; voteCount: number; totalWeight: number; percentage: number }[]
  totalVoters?: number
  totalWeight?: number
}

export function GovernancePanel() {
  const { publicKey } = useWallet()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [userPoints, setUserPoints] = useState(0)
  const [filter, setFilter] = useState<'all' | 'active' | 'executed'>('all')

  useEffect(() => {
    fetchProposals()
    if (publicKey) fetchUserPoints()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const fetchProposals = async () => {
    try {
      const res = await fetch('/api/governance/proposals')
      const data = await res.json()
      if (data.proposals) setProposals(data.proposals)
    } catch {
      // Empty
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPoints = async () => {
    if (!publicKey) return
    try {
      const res = await fetch(`/api/register/check?address=${publicKey.toBase58()}`)
      const data = await res.json()
      if (data.user) setUserPoints(data.user.reward_points || data.user.rewardPoints || 0)
    } catch {
      // No points
    }
  }

  const filteredProposals = proposals.filter(p => {
    if (filter === 'active') return p.status === 'active'
    if (filter === 'executed') return p.status === 'executed' || p.status === 'closed'
    return true
  })

  const activeCount = proposals.filter(p => p.status === 'active').length

  return (
    <div className="max-w-2xl mx-auto">
      {/* Council Header */}
      <div className="mb-6 pt-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
            <span className="text-white text-sm">⬡</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">The Council</h2>
            <p className="text-gray-400 text-xs">Crypto governance died because nobody had real stakes. Here, votes control real escrowed funds.</p>
          </div>
        </div>
      </div>

      {/* Voting Power Card — Premium Glass */}
      <div className="council-card p-6 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Your voting power</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold counter tracking-tight">{userPoints.toLocaleString()}</p>
              <p className="text-xs text-gray-300">pts</p>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              {userPoints >= 100 ? (
                <span className="text-emerald-600 font-medium">✦ Council member — you can create resolutions</span>
              ) : (
                <span>{Math.max(0, 100 - userPoints)} more points to join the council</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            disabled={userPoints < 100}
            className="btn-gradient py-3 px-6 text-xs rounded-2xl"
          >
            New Resolution
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-black/[0.04]">
          <div>
            <p className="text-lg font-bold counter">{activeCount}</p>
            <p className="text-[10px] text-gray-400">Active</p>
          </div>
          <div>
            <p className="text-lg font-bold counter">{proposals.length}</p>
            <p className="text-[10px] text-gray-400">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold counter">{proposals.filter(p => p.status === 'executed').length}</p>
            <p className="text-[10px] text-gray-400">Executed</p>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateProposal
          creatorAddress={publicKey?.toBase58() || ''}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            fetchProposals()
          }}
        />
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-50 rounded-2xl p-1">
        {(['all', 'active', 'executed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
              filter === f
                ? 'bg-white text-gray-900 shadow-soft'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Executed'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-44" />)}
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="council-card p-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⬡</span>
          </div>
          <p className="text-gray-900 font-semibold mb-1">No resolutions yet</p>
          <p className="text-gray-400 text-sm">Earn 100+ points by donating to create one.</p>
        </div>
      ) : (
        <div className="space-y-3 animate-stagger">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              voterAddress={publicKey?.toBase58() || ''}
              onVoted={fetchProposals}
            />
          ))}
        </div>
      )}
    </div>
  )
}
