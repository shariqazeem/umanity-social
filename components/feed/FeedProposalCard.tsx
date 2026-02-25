'use client'

import { useState } from 'react'

interface FeedProposalCardProps {
  proposal: {
    id: string
    title: string
    description: string
    options: string[]
    status: string
    total_votes: number
    created_at: string
    closes_at: string
    proposal_type?: string
    campaign_id?: string
    milestone_index?: number
    results?: { option: string; index: number; voteCount: number; totalWeight: number; percentage: number }[]
    totalVoters?: number
    totalWeight?: number
  }
  voterAddress: string
  onVoted: () => void
}

export function FeedProposalCard({ proposal, voterAddress, onVoted }: FeedProposalCardProps) {
  const [voting, setVoting] = useState(false)
  const [voted, setVoted] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [executeResult, setExecuteResult] = useState<{ approved: boolean; message: string } | null>(null)
  const [error, setError] = useState('')

  const isExpired = new Date(proposal.closes_at) < new Date()
  const isActive = proposal.status === 'active' && !isExpired
  const isExecuted = proposal.status === 'executed'
  const canExecute = isExpired && proposal.status === 'active'
  const isFundRelease = proposal.proposal_type === 'fund_release'

  const timeLeft = () => {
    const diff = new Date(proposal.closes_at).getTime() - Date.now()
    if (diff <= 0) return 'Ended'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h left`
    return `${hours}h left`
  }

  const handleVote = async (optionIndex: number) => {
    if (voting || voted || !voterAddress) return
    setVoting(true)
    setError('')
    try {
      const res = await fetch('/api/governance/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          voterAddress,
          voteOption: optionIndex,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setVoted(true)
        onVoted()
      }
    } catch {
      setError('Failed to cast vote')
    } finally {
      setVoting(false)
    }
  }

  const handleExecute = async () => {
    if (executing) return
    setExecuting(true)
    setError('')
    try {
      const res = await fetch('/api/governance/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.id }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setExecuteResult({ approved: data.approved, message: data.message })
        onVoted()
      }
    } catch {
      setError('Failed to execute')
    } finally {
      setExecuting(false)
    }
  }

  const results = proposal.results && proposal.results.length > 0
    ? proposal.results
    : (proposal.options || []).map((opt, i) => ({
        option: opt,
        index: i,
        voteCount: 0,
        totalWeight: 0,
        percentage: 0,
      }))

  return (
    <div className={`card p-5 mb-3 border-l-4 ${isFundRelease ? 'border-l-emerald-400' : 'border-l-amber-400'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          isFundRelease
            ? 'text-emerald-600 bg-emerald-50'
            : 'text-amber-600 bg-amber-50'
        }`}>
          {isFundRelease ? 'Fund Release Vote' : 'Governance'}
        </span>
        <span className={`text-[10px] font-medium ${
          isActive ? 'text-emerald-600'
          : canExecute ? 'text-amber-600'
          : isExecuted ? 'text-blue-600'
          : 'text-gray-400'
        }`}>
          {isActive ? timeLeft() : canExecute ? 'Ready to execute' : isExecuted ? 'Executed' : 'Ended'}
        </span>
      </div>

      <h3 className="font-semibold mb-1 text-sm">{proposal.title}</h3>
      <p className="text-xs text-gray-400 leading-relaxed mb-4">{proposal.description}</p>

      <div className="space-y-2 mb-3">
        {results.map((result) => (
          <button
            key={result.index}
            onClick={() => handleVote(result.index)}
            disabled={!isActive || voted || voting || !voterAddress}
            className={`w-full text-left rounded-xl p-3 transition-all relative overflow-hidden ${
              isActive && !voted
                ? 'border-2 border-gray-100 hover:border-[#111] cursor-pointer'
                : 'border border-gray-50'
            } disabled:cursor-default`}
          >
            <div
              className="absolute inset-0 bg-gray-50 transition-all duration-700"
              style={{ width: `${result.percentage || 0}%` }}
            />
            <div className="relative flex justify-between items-center">
              <span className="text-xs font-medium">{result.option}</span>
              <span className="text-xs font-bold counter">{result.percentage?.toFixed(0) || 0}%</span>
            </div>
          </button>
        ))}
      </div>

      {/* Execute button */}
      {canExecute && !executeResult && (
        <button
          onClick={handleExecute}
          disabled={executing}
          className={`w-full py-2.5 rounded-xl text-xs font-medium mb-3 transition-all ${
            isFundRelease
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-[#111] text-white hover:bg-gray-800'
          }`}
        >
          {executing ? 'Executing...' : 'Execute & Finalize'}
        </button>
      )}

      {/* Execute result */}
      {executeResult && (
        <div className={`rounded-xl p-3 mb-3 ${executeResult.approved ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <p className={`text-xs font-medium ${executeResult.approved ? 'text-emerald-700' : 'text-red-700'}`}>
            {executeResult.message}
          </p>
        </div>
      )}

      {error && <p className="text-red-500 text-[11px] mb-2">{error}</p>}

      <div className="text-[10px] text-gray-400 pt-2 border-t border-black/[0.03]">
        {proposal.totalVoters || 0} voters · {proposal.totalWeight || 0} weight
      </div>
    </div>
  )
}
