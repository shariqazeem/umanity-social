import { supabase } from './supabase'
import { getFollowers, getReferralChain } from './tapestry'

export interface ImpactScoreBreakdown {
  donations: number
  consistency: number
  governance: number
  social: number
  tipping: number
  referrals: number
  loyalty: number
  total: number
  tier: string
}

const TIERS = [
  { name: 'Seedling', min: 0 },
  { name: 'Sprout', min: 50 },
  { name: 'Bloom', min: 150 },
  { name: 'Champion', min: 350 },
  { name: 'Legend', min: 600 },
  { name: 'Luminary', min: 850 },
] as const

function getTier(score: number): string {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].min) return TIERS[i].name
  }
  return 'Seedling'
}

export async function calculateImpactScore(address: string, username: string): Promise<ImpactScoreBreakdown> {
  // Fetch user data from Supabase
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('address', address)
    .single()

  if (!user) {
    return { donations: 0, consistency: 0, governance: 0, social: 0, tipping: 0, referrals: 0, loyalty: 0, total: 0, tier: 'Seedling' }
  }

  // Donations component (max 300)
  const donations = Math.min(300, Math.round((user.total_donated || 0) * 100))

  // Consistency (max 100)
  const consistency = Math.min(100, (user.donation_count || 0) * 5)

  // Governance (max 150)
  let governance = 0
  try {
    const { count: voteCount } = await supabase
      .from('governance_votes')
      .select('*', { count: 'exact', head: true })
      .eq('voter_address', address)
    governance = Math.min(150, (voteCount || 0) * 10)
  } catch {
    // No governance votes table or no votes
  }

  // Social (max 200)
  let social = 0
  try {
    const followers = await getFollowers(username)
    social = Math.min(200, (followers?.length || 0))
  } catch {
    // Tapestry may fail
  }

  // Tipping (max 100)
  const tipping = Math.min(100, (user.tip_count_sent || 0) * 5)

  // Referrals (max 100)
  let referrals = 0
  try {
    const chain = await getReferralChain(username, 1)
    const referralCount = Array.isArray(chain?.referrals) ? chain.referrals.length : 0
    referrals = Math.min(100, referralCount * 15)
  } catch {
    // No referrals
  }

  // Loyalty (max 50)
  const createdAt = new Date(user.created_at)
  const daysSinceJoin = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  const loyalty = Math.min(50, Math.round(daysSinceJoin * 0.5))

  const total = donations + consistency + governance + social + tipping + referrals + loyalty
  const tier = getTier(total)

  return { donations, consistency, governance, social, tipping, referrals, loyalty, total, tier }
}

export { TIERS }
