import { supabase } from './supabase'

export interface Campaign {
  id: string
  pool_id: string
  recipient: string
  target_amount: number
  total_raised: number
  deadline: string
  is_active: boolean
  created_at?: string
}

export interface CampaignMilestone {
  id: string
  campaign_id: string
  index: number
  description: string
  percentage: number
  status: 'pending' | 'approved' | 'released' | 'rejected'
  governance_proposal_id?: string
  created_at?: string
}

export async function getCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getCampaignByPoolId(poolId: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('pool_id', poolId)
    .single()

  if (error) return null
  return data
}

export async function createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert(campaign)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMilestones(campaignId: string): Promise<CampaignMilestone[]> {
  const { data, error } = await supabase
    .from('campaign_milestones')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('index', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createMilestone(milestone: Omit<CampaignMilestone, 'id' | 'created_at'>): Promise<CampaignMilestone> {
  const { data, error } = await supabase
    .from('campaign_milestones')
    .insert(milestone)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCampaignTotalRaised(campaignId: string, additionalAmount: number): Promise<void> {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('total_raised')
    .eq('id', campaignId)
    .single()

  if (!campaign) return

  await supabase
    .from('campaigns')
    .update({ total_raised: (campaign.total_raised || 0) + additionalAmount })
    .eq('id', campaignId)
}

export async function updateMilestoneStatus(
  milestoneId: string,
  status: CampaignMilestone['status'],
  proposalId?: string
): Promise<void> {
  const update: Record<string, unknown> = { status }
  if (proposalId) update.governance_proposal_id = proposalId

  await supabase
    .from('campaign_milestones')
    .update(update)
    .eq('id', milestoneId)
}
