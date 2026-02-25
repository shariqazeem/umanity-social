/**
 * Initialize campaigns with milestones for the 5 existing pools.
 *
 * Usage: npx tsx scripts/init-campaigns.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface CampaignConfig {
  pool_id: string
  pool_name: string
  recipient: string // placeholder devnet wallet
  target_amount: number // in SOL
  deadline_days: number
  milestones: { description: string; percentage: number }[]
}

const CAMPAIGNS: CampaignConfig[] = [
  {
    pool_id: 'palestine-red-crescent',
    pool_name: 'Palestine Red Crescent Society',
    recipient: 'EsWeMEvuLDV2Q4CXigZbETzqXfEQwZntQjwD4Cy8AgY5',
    target_amount: 10,
    deadline_days: 90,
    milestones: [
      { description: 'Emergency medical supplies purchased for PRCS', percentage: 30 },
      { description: 'Field clinic equipment delivered to Palestine Red Crescent', percentage: 30 },
      { description: 'Full medical aid package delivered — proof posted on X', percentage: 40 },
    ],
  },
  {
    pool_id: 'turkish-red-crescent',
    pool_name: 'Turkish Red Crescent (Kizilay)',
    recipient: 'EsWeMEvuLDV2Q4CXigZbETzqXfEQwZntQjwD4Cy8AgY5',
    target_amount: 12,
    deadline_days: 90,
    milestones: [
      { description: 'Emergency relief supplies procured for Kizilay', percentage: 40 },
      { description: 'Shelter materials delivered to earthquake zones', percentage: 30 },
      { description: 'Full donation delivered to Turkish Red Crescent — proof on X', percentage: 30 },
    ],
  },
  {
    pool_id: 'mercy-corps',
    pool_name: 'Mercy Corps',
    recipient: 'EsWeMEvuLDV2Q4CXigZbETzqXfEQwZntQjwD4Cy8AgY5',
    target_amount: 8,
    deadline_days: 60,
    milestones: [
      { description: 'Water purification supplies purchased for Mercy Corps', percentage: 30 },
      { description: 'Food security packages assembled', percentage: 35 },
      { description: 'Full donation delivered to Mercy Corps — proof on X', percentage: 35 },
    ],
  },
  {
    pool_id: 'edhi-foundation',
    pool_name: 'Edhi Foundation',
    recipient: 'EsWeMEvuLDV2Q4CXigZbETzqXfEQwZntQjwD4Cy8AgY5',
    target_amount: 8,
    deadline_days: 60,
    milestones: [
      { description: 'Orphan care supplies purchased for Edhi Foundation', percentage: 30 },
      { description: 'Medical equipment donated to Edhi ambulance service', percentage: 30 },
      { description: 'Full donation delivered to Edhi Foundation — proof on X', percentage: 40 },
    ],
  },
  {
    pool_id: 'orphanage-aid',
    pool_name: 'Local Orphanage Aid',
    recipient: 'EsWeMEvuLDV2Q4CXigZbETzqXfEQwZntQjwD4Cy8AgY5',
    target_amount: 5,
    deadline_days: 60,
    milestones: [
      { description: 'School supplies and clothing purchased', percentage: 30 },
      { description: 'Umanity team visits orphanage — photo/video proof on X', percentage: 35 },
      { description: 'Full delivery complete with receipts posted on X', percentage: 35 },
    ],
  },
  {
    pool_id: 'animal-rescue',
    pool_name: 'Street Animal Rescue',
    recipient: 'EsWeMEvuLDV2Q4CXigZbETzqXfEQwZntQjwD4Cy8AgY5',
    target_amount: 4,
    deadline_days: 45,
    milestones: [
      { description: 'Animal food and vet supplies purchased', percentage: 35 },
      { description: 'Umanity team feeds and treats street animals — video proof on X', percentage: 35 },
      { description: 'Full rescue round complete with receipts posted on X', percentage: 30 },
    ],
  },
]

async function main() {
  console.log('Initializing campaigns for 6 charity pools...\n')

  for (const config of CAMPAIGNS) {
    // Check if campaign already exists
    const { data: existing } = await supabase
      .from('campaigns')
      .select('id')
      .eq('pool_id', config.pool_id)
      .single()

    if (existing) {
      console.log(`  [skip] Campaign for ${config.pool_name} already exists (${existing.id})`)
      continue
    }

    const deadline = new Date(Date.now() + config.deadline_days * 24 * 60 * 60 * 1000).toISOString()

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        pool_id: config.pool_id,
        recipient: config.recipient,
        target_amount: config.target_amount,
        total_raised: 0,
        deadline,
        is_active: true,
      })
      .select()
      .single()

    if (campaignError) {
      console.error(`  [error] Failed to create campaign for ${config.pool_name}:`, campaignError.message)
      continue
    }

    console.log(`  [ok] Created campaign for ${config.pool_name} (${campaign.id})`)

    // Create milestones
    for (let i = 0; i < config.milestones.length; i++) {
      const ms = config.milestones[i]
      const { error: msError } = await supabase
        .from('campaign_milestones')
        .insert({
          campaign_id: campaign.id,
          index: i,
          description: ms.description,
          percentage: ms.percentage,
          status: 'pending',
        })

      if (msError) {
        console.error(`    [error] Milestone ${i}: ${msError.message}`)
      } else {
        console.log(`    [ok] Milestone ${i}: ${ms.description} (${ms.percentage}%)`)
      }
    }
    console.log()
  }

  console.log('Done!')
}

main().catch(console.error)
