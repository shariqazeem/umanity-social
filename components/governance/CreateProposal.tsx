'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Campaign {
  id: string
  pool_id: string
  target_amount: number
  total_raised: number
}

interface Milestone {
  id: string
  index: number
  description: string
  percentage: number
  status: string
}

interface CreateProposalProps {
  creatorAddress: string
  onClose: () => void
  onCreated: () => void
}

import { POOL_RECIPIENTS } from '@/lib/constants'

const POOL_LABELS: Record<string, string> = {
  'palestine-red-crescent': 'Palestine Red Crescent Society',
  'turkish-red-crescent': 'Turkish Red Crescent (Kizilay)',
  'mercy-corps': 'Mercy Corps',
  'edhi-foundation': 'Edhi Foundation',
  'orphanage-aid': 'Local Orphanage Aid',
  'animal-rescue': 'Street Animal Rescue',
}

export function CreateProposal({ creatorAddress, onClose, onCreated }: CreateProposalProps) {
  const [mode, setMode] = useState<'choose' | 'fund_release' | 'custom'>('choose')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [duration, setDuration] = useState(72)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fund release mode state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  useEffect(() => {
    if (mode === 'fund_release') fetchCampaigns()
  }, [mode])

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true)
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      if (data.campaigns) setCampaigns(data.campaigns.filter((c: Campaign) => c.total_raised > 0))
    } catch {
      // No campaigns
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const selectCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setSelectedMilestone(null)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/milestones`)
      const data = await res.json()
      if (data.milestones) {
        // Only show pending milestones
        setMilestones(data.milestones.filter((m: Milestone) => m.status === 'pending'))
      }
    } catch {
      // No milestones
    }
  }

  const selectMilestone = (milestone: Milestone) => {
    if (!selectedCampaign) return
    setSelectedMilestone(milestone)
    const poolLabel = POOL_LABELS[selectedCampaign.pool_id] || selectedCampaign.pool_id
    const releaseAmount = ((milestone.percentage / 100) * selectedCampaign.total_raised).toFixed(3)
    const recipient = POOL_RECIPIENTS[selectedCampaign.pool_id]
    const recipientInfo = recipient
      ? ` Funds release to Umanity Org wallet (${recipient.address.slice(0, 4)}...${recipient.address.slice(-4)}) for verified delivery to ${poolLabel}. Proof of delivery posted on @umanity_xyz X page.`
      : ''
    setTitle(`Release funds: ${poolLabel} - Milestone ${milestone.index + 1}`)
    setDescription(
      `Vote to release ${milestone.percentage}% (~${releaseAmount} SOL) of escrowed funds for: "${milestone.description}". ` +
      `Total raised: ${selectedCampaign.total_raised} SOL. Target: ${selectedCampaign.target_amount} SOL.` +
      recipientInfo
    )
    setOptions(['Yes, release funds', 'No, hold funds'])
  }

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ''])
  }

  const updateOption = (index: number, value: string) => {
    const updated = [...options]
    updated[index] = value
    setOptions(updated)
  }

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required')
      return
    }
    const validOptions = options.filter(o => o.trim())
    if (validOptions.length < 2) {
      setError('At least 2 options are required')
      return
    }

    setLoading(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        creatorAddress,
        title: title.trim(),
        description: description.trim(),
        options: validOptions,
        durationHours: duration,
      }

      // If fund release, include campaign metadata
      if (mode === 'fund_release' && selectedCampaign && selectedMilestone) {
        body.proposalType = 'fund_release'
        body.campaignId = selectedCampaign.id
        body.milestoneIndex = selectedMilestone.index
      }

      const res = await fetch('/api/governance/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        onCreated()
      }
    } catch {
      setError('Failed to create proposal')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[100] p-5">
      <div className="bg-white rounded-3xl max-w-md w-full p-7 animate-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">
            {mode === 'choose' ? 'New proposal' : mode === 'fund_release' ? 'Fund Release Proposal' : 'Custom Proposal'}
          </h3>
          <button onClick={onClose} className="btn-ghost w-8 h-8 flex items-center justify-center text-lg">&times;</button>
        </div>

        {/* Step 1: Choose proposal type */}
        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('fund_release')}
              className="w-full card-interactive p-5 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">
                  &#9635;
                </div>
                <div>
                  <p className="font-semibold text-sm">Fund Release Vote</p>
                  <p className="text-[11px] text-gray-400">Vote to release escrowed milestone funds to a cause</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setMode('custom')}
              className="w-full card-interactive p-5 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg">
                  &#9733;
                </div>
                <div>
                  <p className="font-semibold text-sm">Custom Proposal</p>
                  <p className="text-[11px] text-gray-400">Create any governance proposal for the community</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Fund Release: select campaign + milestone */}
        {mode === 'fund_release' && !selectedMilestone && (
          <div className="space-y-4">
            <button onClick={() => setMode('choose')} className="text-xs text-gray-400 hover:text-gray-600 mb-2">
              &larr; Back
            </button>

            {!selectedCampaign ? (
              <>
                <p className="text-xs text-gray-500 mb-3">Select a campaign to release funds from:</p>
                {loadingCampaigns ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16" />)}</div>
                ) : campaigns.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="text-sm text-gray-400">No campaigns with funds yet</p>
                    <p className="text-xs text-gray-300 mt-1">Campaigns need donations before funds can be released.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {campaigns.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectCampaign(c)}
                        className="w-full card-interactive p-4 text-left"
                      >
                        <p className="text-sm font-medium">{POOL_LABELS[c.pool_id] || c.pool_id}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {c.total_raised} / {c.target_amount} SOL raised
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => { setSelectedCampaign(null); setMilestones([]) }} className="text-xs text-gray-400 hover:text-gray-600">
                    &larr;
                  </button>
                  <p className="text-xs text-gray-500">Select a milestone to release:</p>
                </div>

                <div className="card p-3 mb-3 bg-gray-50">
                  <p className="text-sm font-medium">{POOL_LABELS[selectedCampaign.pool_id] || selectedCampaign.pool_id}</p>
                  <p className="text-[11px] text-gray-400">{selectedCampaign.total_raised} / {selectedCampaign.target_amount} SOL raised</p>
                  {POOL_RECIPIENTS[selectedCampaign.pool_id] && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-[10px] text-gray-400">Via Umanity Org </span>
                      <a
                        href={`https://solscan.io/account/${POOL_RECIPIENTS[selectedCampaign.pool_id].address}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline font-mono"
                      >
                        {POOL_RECIPIENTS[selectedCampaign.pool_id].address.slice(0, 4)}...{POOL_RECIPIENTS[selectedCampaign.pool_id].address.slice(-4)}
                      </a>
                      <span className="text-[10px] text-gray-300">{'·'} Proof on X</span>
                    </div>
                  )}
                </div>

                {milestones.length === 0 ? (
                  <div className="card p-6 text-center">
                    <p className="text-sm text-gray-400">No pending milestones</p>
                    <p className="text-xs text-gray-300 mt-1">All milestones have already been proposed or released.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {milestones.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => selectMilestone(m)}
                        className="w-full card-interactive p-4 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Milestone {m.index + 1}</p>
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{m.percentage}%</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                        <p className="text-[10px] text-emerald-600 mt-1">
                          ~{((m.percentage / 100) * selectedCampaign.total_raised).toFixed(3)} SOL to release
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Proposal form (shown for custom mode or after selecting fund release milestone) */}
        {(mode === 'custom' || (mode === 'fund_release' && selectedMilestone)) && (
          <div className="space-y-4">
            {mode === 'custom' && (
              <button onClick={() => setMode('choose')} className="text-xs text-gray-400 hover:text-gray-600 mb-2">
                &larr; Back
              </button>
            )}
            {mode === 'fund_release' && selectedMilestone && (
              <button onClick={() => setSelectedMilestone(null)} className="text-xs text-gray-400 hover:text-gray-600 mb-2">
                &larr; Change milestone
              </button>
            )}

            {mode === 'fund_release' && (
              <div className="card p-3 bg-emerald-50 border border-emerald-200 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-emerald-700">Fund Release Vote</span>
                </div>
                <p className="text-[10px] text-emerald-600 mt-1">This proposal will appear with a green badge in the feed.</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'fund_release' ? 'Release funds: Pool - Milestone N' : 'e.g. Allocate funds to clean water initiative'}
                maxLength={100}
                className="input"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={mode === 'fund_release'
                  ? 'Explain what this milestone achieved and why funds should be released.'
                  : 'e.g. Propose directing 50% of this month\'s donations to the Clean Water Kenya campaign.'}
                maxLength={500}
                rows={3}
                className="input resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Options ({options.length}/4)
              </label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={mode === 'fund_release'
                        ? (i === 0 ? 'Yes, release funds' : 'No, hold funds')
                        : `Option ${i + 1}`}
                      maxLength={100}
                      className="input flex-1"
                    />
                    {options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="btn-ghost px-2 text-gray-400 hover:text-red-500">
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 4 && (
                <button onClick={addOption} className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                  + Add option
                </button>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Duration</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input">
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours (3 days)</option>
                <option value={168}>1 week</option>
              </select>
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-3.5 text-sm">
              {loading ? 'Creating...' : 'Create proposal'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
