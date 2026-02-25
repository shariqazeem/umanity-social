import { supabase } from './supabase'

export interface Proposal {
  id: string
  creator_address: string
  title: string
  description: string
  options: string[]
  status: 'active' | 'closed' | 'executed'
  total_votes: number
  created_at: string
  closes_at: string
  realm_proposal_pubkey?: string
}

export interface Vote {
  id: string
  proposal_id: string
  voter_address: string
  vote_option: number
  vote_weight: number
  created_at: string
}

export async function createProposal(
  creatorAddress: string,
  title: string,
  description: string,
  options: string[],
  durationHours: number = 72,
  proposalType?: string,
  campaignId?: string,
  milestoneIndex?: number
) {
  // Check user has min 100 reward points
  const { data: user } = await supabase
    .from('users')
    .select('reward_points')
    .eq('address', creatorAddress)
    .single()

  if (!user || (user.reward_points || 0) < 100) {
    throw new Error('You need at least 100 reward points to create a proposal')
  }

  const closesAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

  const insert: Record<string, unknown> = {
    creator_address: creatorAddress,
    title,
    description,
    options,
    status: 'active',
    total_votes: 0,
    closes_at: closesAt,
    proposal_type: proposalType || 'general',
  }

  if (campaignId) insert.campaign_id = campaignId
  if (milestoneIndex !== undefined) insert.milestone_index = milestoneIndex

  const { data, error } = await supabase
    .from('governance_proposals')
    .insert(insert)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function castVote(
  proposalId: string,
  voterAddress: string,
  voteOption: number
) {
  // Get voter's reward points (= vote weight)
  const { data: user } = await supabase
    .from('users')
    .select('reward_points')
    .eq('address', voterAddress)
    .single()

  if (!user) throw new Error('User not found. Please register first.')

  const voteWeight = user.reward_points || 1

  // Check if already voted
  const { data: existingVote } = await supabase
    .from('governance_votes')
    .select('id')
    .eq('proposal_id', proposalId)
    .eq('voter_address', voterAddress)
    .single()

  if (existingVote) {
    throw new Error('You have already voted on this proposal')
  }

  // Check proposal is still active
  const { data: proposal } = await supabase
    .from('governance_proposals')
    .select('status, closes_at')
    .eq('id', proposalId)
    .single()

  if (!proposal || proposal.status !== 'active') {
    throw new Error('This proposal is no longer active')
  }

  if (new Date(proposal.closes_at) < new Date()) {
    throw new Error('This proposal has expired')
  }

  // Cast vote
  const { error: voteError } = await supabase
    .from('governance_votes')
    .insert({
      proposal_id: proposalId,
      voter_address: voterAddress,
      vote_option: voteOption,
      vote_weight: voteWeight,
    })

  if (voteError) throw voteError

  // Update total votes on proposal
  await supabase
    .from('governance_proposals')
    .update({ total_votes: (proposal as any).total_votes ? (proposal as any).total_votes + 1 : 1 })
    .eq('id', proposalId)

  return { success: true, voteWeight }
}

export async function getActiveProposals() {
  const { data, error } = await supabase
    .from('governance_proposals')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAllProposals() {
  const { data, error } = await supabase
    .from('governance_proposals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getProposalVotes(proposalId: string) {
  const { data, error } = await supabase
    .from('governance_votes')
    .select('*')
    .eq('proposal_id', proposalId)

  if (error) throw error
  return data || []
}

export async function createMilestoneProposal(
  campaignId: string,
  milestoneIndex: number,
  poolName: string,
  milestoneDescription: string,
  authority: string
) {
  const title = `Release funds: ${poolName} - Milestone ${milestoneIndex + 1}`
  const description = `This proposal votes on releasing escrowed funds for: "${milestoneDescription}". Approved funds will be released to Umanity Org wallet for verified delivery to ${poolName}. Proof of delivery posted on @umanity_xyz X page.`
  const options = ['Yes, release funds', 'No, hold funds']
  const closesAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('governance_proposals')
    .insert({
      creator_address: authority,
      title,
      description,
      options,
      status: 'active',
      total_votes: 0,
      closes_at: closesAt,
      campaign_id: campaignId,
      milestone_index: milestoneIndex,
      proposal_type: 'fund_release',
    })
    .select()
    .single()

  if (error) throw error

  // Link proposal to milestone
  if (data) {
    await supabase
      .from('campaign_milestones')
      .update({ governance_proposal_id: data.id })
      .eq('campaign_id', campaignId)
      .eq('index', milestoneIndex)
  }

  return data
}

export async function getProposalResults(proposalId: string) {
  const { data: proposal } = await supabase
    .from('governance_proposals')
    .select('*')
    .eq('id', proposalId)
    .single()

  if (!proposal) throw new Error('Proposal not found')

  const { data: votes } = await supabase
    .from('governance_votes')
    .select('*')
    .eq('proposal_id', proposalId)

  const options = proposal.options as string[]
  const results = options.map((option: string, index: number) => {
    const optionVotes = (votes || []).filter((v: Vote) => v.vote_option === index)
    const totalWeight = optionVotes.reduce((sum: number, v: Vote) => sum + v.vote_weight, 0)
    return {
      option,
      index,
      voteCount: optionVotes.length,
      totalWeight,
    }
  })

  const totalWeight = results.reduce((sum, r) => sum + r.totalWeight, 0)

  return {
    proposal,
    results: results.map(r => ({
      ...r,
      percentage: totalWeight > 0 ? (r.totalWeight / totalWeight) * 100 : 0,
    })),
    totalVoters: (votes || []).length,
    totalWeight,
  }
}
