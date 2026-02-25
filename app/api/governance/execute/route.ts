import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProposalResults } from '@/lib/governance'
import { updateMilestoneStatus } from '@/lib/campaigns'

/**
 * POST /api/governance/execute
 *
 * Executes a completed fund-release proposal:
 * 1. Verifies voting period ended
 * 2. Tallies results — "Yes" must win by weight
 * 3. Closes the proposal
 * 4. If approved: marks milestone as "approved" (ready for on-chain release)
 * 5. If rejected: marks milestone status stays "pending"
 */
export async function POST(request: NextRequest) {
  try {
    const { proposalId } = await request.json()

    if (!proposalId) {
      return NextResponse.json({ error: 'proposalId required' }, { status: 400 })
    }

    // 1. Fetch proposal
    const { data: proposal, error: proposalErr } = await supabase
      .from('governance_proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (proposalErr || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // 2. Verify voting period ended
    const now = new Date()
    const closesAt = new Date(proposal.closes_at)
    if (closesAt > now) {
      return NextResponse.json({ error: 'Voting period has not ended yet' }, { status: 400 })
    }

    // 3. Check not already executed
    if (proposal.status === 'executed') {
      return NextResponse.json({ error: 'Proposal already executed' }, { status: 400 })
    }

    // 4. Tally results
    const results = await getProposalResults(proposalId)
    const yesResult = results.results.find(r => r.option.toLowerCase().includes('yes'))
    const noResult = results.results.find(r => r.option.toLowerCase().includes('no'))

    const yesWeight = yesResult?.totalWeight || 0
    const noWeight = noResult?.totalWeight || 0
    const approved = yesWeight > noWeight

    // 5. Close the proposal
    await supabase
      .from('governance_proposals')
      .update({ status: 'executed' })
      .eq('id', proposalId)

    // 6. Handle fund-release proposals
    let milestoneAction = null
    if (proposal.proposal_type === 'fund_release' && proposal.campaign_id != null && proposal.milestone_index != null) {
      if (approved) {
        // Mark milestone as approved — ready for on-chain fund release
        const { data: milestones } = await supabase
          .from('campaign_milestones')
          .select('id')
          .eq('campaign_id', proposal.campaign_id)
          .eq('index', proposal.milestone_index)
          .single()

        if (milestones) {
          await updateMilestoneStatus(milestones.id, 'approved', proposalId)
          milestoneAction = 'approved'
        }
      } else {
        milestoneAction = 'rejected'
        // Milestone stays pending — can re-propose later
      }
    }

    return NextResponse.json({
      success: true,
      approved,
      yesWeight,
      noWeight,
      totalVoters: results.totalVoters,
      milestoneAction,
      message: approved
        ? proposal.proposal_type === 'fund_release'
          ? 'Proposal passed! Milestone approved for fund release. Authority can now release funds on-chain.'
          : 'Proposal passed!'
        : 'Proposal did not pass. No action taken.',
    })
  } catch (error: any) {
    console.error('Execute proposal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
