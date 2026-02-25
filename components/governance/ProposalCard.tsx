'use client'

import { useState } from 'react'
import { POOL_RECIPIENTS } from '@/lib/constants'

interface ProposalResult {
  option: string
  index: number
  voteCount: number
  totalWeight: number
  percentage: number
}

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
  proposal_type?: string
  campaign_id?: string
  milestone_index?: number
  recipient?: { pool_id: string; address: string }
  results?: ProposalResult[]
  totalVoters?: number
  totalWeight?: number
}

interface ProposalCardProps {
  proposal: Proposal
  voterAddress: string
  onVoted: () => void
}

export function ProposalCard({ proposal, voterAddress, onVoted }: ProposalCardProps) {
  const [voting, setVoting] = useState(false)
  const [voted, setVoted] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [executeResult, setExecuteResult] = useState<{
    approved: boolean
    message: string
    milestoneAction?: string
  } | null>(null)
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
        setExecuteResult({
          approved: data.approved,
          message: data.message,
          milestoneAction: data.milestoneAction,
        })
        onVoted() // refresh proposals list
      }
    } catch {
      setError('Failed to execute proposal')
    } finally {
      setExecuting(false)
    }
  }

  const results = proposal.results && proposal.results.length > 0
    ? proposal.results
    : proposal.options.map((opt, i) => ({
        option: opt,
        index: i,
        voteCount: 0,
        totalWeight: 0,
        percentage: 0,
      }))

  // Determine winner for display
  const winnerIdx = results.reduce((maxI, r, i, arr) => r.totalWeight > arr[maxI].totalWeight ? i : maxI, 0)

  return (
    <div className={`card p-6 ${isFundRelease ? 'border-l-4 border-l-emerald-400' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-4">
          {isFundRelease && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mb-2 inline-block">
              Fund Release Vote
            </span>
          )}
          <h3 className="font-semibold mb-1">{proposal.title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">{proposal.description}</p>
          {isFundRelease && proposal.recipient && (
            <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-gray-50 rounded-lg flex-wrap">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-[10px] text-gray-500">Via Umanity Org</span>
              <a
                href={`https://solscan.io/account/${proposal.recipient.address}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-500 hover:underline font-mono"
              >
                {proposal.recipient.address.slice(0, 4)}...{proposal.recipient.address.slice(-4)}
              </a>
              <span className="text-[10px] text-gray-300">{'·'} Proof on X</span>
            </div>
          )}
        </div>
        <span className={`pill flex-shrink-0 text-[10px] ${
          isActive ? 'bg-emerald-50 text-emerald-600'
          : isExecuted ? 'bg-blue-50 text-blue-600'
          : canExecute ? 'bg-amber-50 text-amber-600'
          : 'bg-gray-100 text-gray-500'
        }`}>
          {isActive ? timeLeft() : isExecuted ? 'Executed' : canExecute ? 'Ready to execute' : 'Ended'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {results.map((result, i) => (
          <button
            key={result.index}
            onClick={() => handleVote(result.index)}
            disabled={!isActive || voted || voting}
            className={`w-full text-left rounded-2xl p-4 transition-all relative overflow-hidden ${
              isActive && !voted
                ? 'border-2 border-gray-100 hover:border-[#111] cursor-pointer'
                : isExecuted && i === winnerIdx && results[winnerIdx].totalWeight > 0
                  ? 'border-2 border-emerald-200'
                  : 'border border-gray-50'
            } disabled:cursor-default`}
          >
            <div
              className={`absolute inset-0 transition-all duration-700 ${
                isExecuted && i === winnerIdx && results[winnerIdx].totalWeight > 0
                  ? 'bg-emerald-50'
                  : 'bg-gray-50'
              }`}
              style={{ width: `${result.percentage || 0}%` }}
            />
            <div className="relative flex justify-between items-center">
              <span className="text-sm font-medium flex items-center gap-1.5">
                {result.option}
                {isExecuted && i === winnerIdx && results[winnerIdx].totalWeight > 0 && (
                  <span className="text-emerald-500 text-xs">&#10003;</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">{result.voteCount}</span>
                <span className="text-xs font-bold counter">
                  {result.percentage?.toFixed(0) || 0}%
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Execute button — shown when voting ended but not yet executed */}
      {canExecute && !executeResult && (
        <div className="mb-4">
          <button
            onClick={handleExecute}
            disabled={executing}
            className={`w-full py-3 rounded-2xl text-sm font-medium transition-all ${
              isFundRelease
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-[#111] text-white hover:bg-gray-800'
            }`}
          >
            {executing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Executing...
              </span>
            ) : isFundRelease ? (
              'Execute: Tally Votes & Approve Milestone'
            ) : (
              'Execute: Close & Tally Results'
            )}
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">
            Voting period ended. Anyone can execute to finalize the result.
          </p>
        </div>
      )}

      {/* Execute result message */}
      {executeResult && (
        <div className={`rounded-2xl p-4 mb-4 ${executeResult.approved ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            {executeResult.approved ? (
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`text-sm font-medium ${executeResult.approved ? 'text-emerald-700' : 'text-red-700'}`}>
              {executeResult.approved ? 'Proposal Passed!' : 'Proposal Did Not Pass'}
            </span>
          </div>
          <p className={`text-xs ${executeResult.approved ? 'text-emerald-600' : 'text-red-600'}`}>
            {executeResult.message}
          </p>
          {executeResult.milestoneAction === 'approved' && (
            <p className="text-[10px] text-emerald-500 mt-2 font-medium">
              Next step: Authority releases funds on-chain via the Anchor program.
            </p>
          )}
        </div>
      )}

      {/* Executed badge for already-executed proposals */}
      {isExecuted && !executeResult && (
        <div className="bg-blue-50 rounded-2xl p-3 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs text-blue-700 font-medium">This proposal has been executed and finalized.</span>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs mb-3">{error}</p>
      )}

      <div className="flex justify-between items-center text-[11px] text-gray-400 pt-3 border-t border-black/[0.03]">
        <span>{proposal.totalVoters || 0} voters · {proposal.totalWeight || 0} weight</span>
        <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
