'use client'

import { useState, useEffect } from 'react'

interface Milestone {
  id: string
  index: number
  description: string
  percentage: number
  status: 'pending' | 'approved' | 'released' | 'rejected'
}

interface MilestoneProgressProps {
  campaignId: string
  totalRaised: number
  targetAmount: number
}

const STATUS_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  pending: { bg: 'bg-gray-100', dot: 'bg-gray-300', label: 'Pending' },
  approved: { bg: 'bg-amber-50', dot: 'bg-amber-400', label: 'Approved' },
  released: { bg: 'bg-emerald-50', dot: 'bg-emerald-500', label: 'Released' },
  rejected: { bg: 'bg-red-50', dot: 'bg-red-400', label: 'Rejected' },
}

export function MilestoneProgress({ campaignId, totalRaised, targetAmount }: MilestoneProgressProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMilestones()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const fetchMilestones = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/milestones`)
      const data = await res.json()
      if (data.milestones) setMilestones(data.milestones)
    } catch {
      // No milestones
    } finally {
      setLoading(false)
    }
  }

  if (loading || milestones.length === 0) return null

  const progressPct = targetAmount > 0 ? Math.min(100, (totalRaised / targetAmount) * 100) : 0
  const completedCount = milestones.filter(m => m.status === 'released').length

  return (
    <div className="mt-4 pt-4 border-t border-black/[0.04]">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-gray-500">Escrow Progress</span>
        <span className="text-[10px] font-medium text-gray-400">
          {completedCount}/{milestones.length} milestones
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Milestone indicators */}
      <div className="space-y-1.5">
        {milestones.map((m) => {
          const style = STATUS_STYLES[m.status] || STATUS_STYLES.pending
          return (
            <div key={m.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${style.bg}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
              <span className="text-[10px] text-gray-600 flex-1 truncate">{m.description}</span>
              <span className="text-[9px] font-medium text-gray-400">{m.percentage}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
