import { NextRequest, NextResponse } from 'next/server'
import { createProposal, getAllProposals, getProposalResults } from '@/lib/governance'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { creatorAddress, title, description, options, durationHours, proposalType, campaignId, milestoneIndex } = await request.json()

    if (!creatorAddress || !title || !description || !options || options.length < 2) {
      return NextResponse.json({
        error: 'creatorAddress, title, description, and at least 2 options required'
      }, { status: 400 })
    }

    const proposal = await createProposal(
      creatorAddress,
      title,
      description,
      options,
      durationHours || 72,
      proposalType,
      campaignId,
      milestoneIndex
    )

    return NextResponse.json({ success: true, proposal })
  } catch (error: any) {
    console.error('Create proposal error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const proposalId = searchParams.get('id')

    if (proposalId) {
      const results = await getProposalResults(proposalId)
      return NextResponse.json({ success: true, ...results })
    }

    const proposals = await getAllProposals()

    // Get results for each proposal + campaign recipient info
    const proposalsWithResults = await Promise.all(
      proposals.map(async (p: any) => {
        try {
          const results = await getProposalResults(p.id)
          let recipient = null
          if (p.campaign_id) {
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('pool_id, recipient')
              .eq('id', p.campaign_id)
              .single()
            if (campaign) recipient = { pool_id: campaign.pool_id, address: campaign.recipient }
          }
          return { ...p, results: results.results, totalVoters: results.totalVoters, totalWeight: results.totalWeight, recipient }
        } catch {
          return { ...p, results: [], totalVoters: 0, totalWeight: 0 }
        }
      })
    )

    return NextResponse.json({ success: true, proposals: proposalsWithResults })
  } catch (error: any) {
    console.error('Get proposals error:', error)
    return NextResponse.json({ success: true, proposals: [] })
  }
}
