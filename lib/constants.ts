// Umanity Program IDs (deployed to devnet)
export const UMANITY_DONATIONS_PROGRAM_ID = '9JBsHFy9rQhjcPiKkFzqxpUV9HZyZ1ZmE4AWXc1Kiys1'
export const UMANITY_TIPS_PROGRAM_ID = 'DBzVAJHgiyVWZMdj1Q2vHUfL1wW4nVag3AqJ5FKmxtau'

// Platform Configuration
export const PLATFORM_CONFIG = {
  // Platform fee (0% for hackathon, can add small fee later)
  PLATFORM_FEE_PERCENT: 0,

  // Unified Reward System - ALL activities use the same formula
  POINTS_PER_SOL: 1000, // 1 SOL = 1000 points (base rate)
  POINTS_TO_TOKEN_RATIO: 100, // 100 points = 1 future token
}

// Unified reward calculation function
export function calculateRewardPoints(solAmount: number): number {
  return Math.floor(solAmount * PLATFORM_CONFIG.POINTS_PER_SOL)
}

// On-chain pool seeds mapping pool IDs to their on-chain seed names
export const POOL_SEEDS: Record<string, string> = {
  'palestine-red-crescent': 'palestine-red-crescent',
  'turkish-red-crescent': 'turkish-red-crescent',
  'mercy-corps': 'mercy-corps',
  'edhi-foundation': 'edhi-foundation',
  'orphanage-aid': 'orphanage-aid',
  'animal-rescue': 'animal-rescue',
}

// Umanity Organization Wallet — receives released escrow funds and delivers to charities IRL
// Proof of every delivery posted on @umanity_xyz X page
export const UMANITY_ORG_WALLET = 'EsWeMEvuLDV2Q4CXigZbETzqXfEQwZntQjwD4Cy8AgY5'
export const UMANITY_ORG_LABEL = 'Umanity Org Wallet'

export const POOL_RECIPIENTS: Record<string, { address: string; label: string }> = {
  'palestine-red-crescent': { address: UMANITY_ORG_WALLET, label: UMANITY_ORG_LABEL },
  'turkish-red-crescent': { address: UMANITY_ORG_WALLET, label: UMANITY_ORG_LABEL },
  'mercy-corps': { address: UMANITY_ORG_WALLET, label: UMANITY_ORG_LABEL },
  'edhi-foundation': { address: UMANITY_ORG_WALLET, label: UMANITY_ORG_LABEL },
  'orphanage-aid': { address: UMANITY_ORG_WALLET, label: UMANITY_ORG_LABEL },
  'animal-rescue': { address: UMANITY_ORG_WALLET, label: UMANITY_ORG_LABEL },
}

// Strategic pool metadata (on-chain pools use PDAs, no hardcoded wallets)
export const POOL_META: Record<string, { emoji: string; category: string; color: string; description: string }> = {
  'palestine-red-crescent': {
    emoji: '\u{1F3E5}',
    category: 'Healthcare',
    color: 'bg-red-50 text-red-600',
    description: 'Medical aid & emergency relief for civilians in Palestine via PRCS',
  },
  'turkish-red-crescent': {
    emoji: '\u{1F198}',
    category: 'Disaster Relief',
    color: 'bg-orange-50 text-orange-600',
    description: 'Earthquake recovery & disaster relief via Turkish Red Crescent (Kizilay)',
  },
  'mercy-corps': {
    emoji: '\u{1F30D}',
    category: 'Food & Water',
    color: 'bg-cyan-50 text-cyan-600',
    description: 'Clean water, food security & crisis response worldwide via Mercy Corps',
  },
  'edhi-foundation': {
    emoji: '\u{1F91D}',
    category: 'Humanitarian',
    color: 'bg-amber-50 text-amber-600',
    description: 'Healthcare, orphan care & emergency services via Edhi Foundation Pakistan',
  },
  'orphanage-aid': {
    emoji: '\u{1F476}',
    category: 'Children',
    color: 'bg-pink-50 text-pink-600',
    description: 'Supplies, education & care for local orphanages — Umanity delivers personally',
  },
  'animal-rescue': {
    emoji: '\u{1F43E}',
    category: 'Animal Welfare',
    color: 'bg-purple-50 text-purple-600',
    description: 'Rescue, shelter & medical care for street animals — Umanity delivers personally',
  },
}

// Default one-tap pool
export const DEFAULT_ONE_TAP_POOL = 'palestine-red-crescent'

// Verified charity partners (now using on-chain pool PDAs)
export const VERIFIED_CHARITIES = [
  {
    id: 'palestine-red-crescent',
    name: 'Palestine Red Crescent Society',
    category: 'Healthcare',
    verified: true,
    description: 'Medical aid & emergency relief for civilians in Palestine via PRCS',
    impact: 'Every 0.1 SOL funds emergency medical supplies for Palestine',
  },
  {
    id: 'turkish-red-crescent',
    name: 'Turkish Red Crescent (Kizilay)',
    category: 'Disaster Relief',
    verified: true,
    description: 'Earthquake recovery & disaster relief via Turkish Red Crescent',
    impact: 'Every 0.2 SOL provides emergency shelter and relief supplies',
  },
  {
    id: 'mercy-corps',
    name: 'Mercy Corps',
    category: 'Food & Water',
    verified: true,
    description: 'Clean water, food security & crisis response worldwide',
    impact: 'Every 0.5 SOL provides clean water access for a family',
  },
  {
    id: 'edhi-foundation',
    name: 'Edhi Foundation',
    category: 'Humanitarian',
    verified: true,
    description: 'Healthcare, orphan care & emergency services via Edhi Foundation Pakistan',
    impact: 'Every 0.1 SOL supports orphan care and ambulance services',
  },
  {
    id: 'orphanage-aid',
    name: 'Local Orphanage Aid',
    category: 'Children',
    verified: true,
    description: 'Supplies, education & care for local orphanages',
    impact: 'Every 0.5 SOL buys supplies personally delivered by Umanity team',
  },
  {
    id: 'animal-rescue',
    name: 'Street Animal Rescue',
    category: 'Animal Welfare',
    verified: true,
    description: 'Rescue, shelter & medical care for street animals',
    impact: 'Every 0.2 SOL funds food and vet care delivered by Umanity team',
  },
]

// Milestone thresholds for auto-posting
export const MILESTONES = {
  FIRST_DONATION: { key: 'first_donation', message: 'Just made my first donation on Umanity!' },
  TOTAL_01_SOL: { key: 'total_01_sol', threshold: 0.1, message: 'Reached 0.1 SOL donated! Building impact on-chain.' },
  FIVE_DONATIONS: { key: 'five_donations', threshold: 5, message: '5 donations and counting! Every bit matters.' },
  SPROUT_TIER: { key: 'sprout_tier', threshold: 100, message: 'Just reached Sprout tier on Umanity!' },
  SAPLING_TIER: { key: 'sapling_tier', threshold: 500, message: 'Leveled up to Sapling tier on Umanity!' },
}

export const DONATION_FLOW = {
  step1: 'User clicks donate',
  step2: 'Anchor program transfers SOL to on-chain vault PDA',
  step3: 'DonationRecord created on-chain',
  step4: 'Backend syncs to Supabase + checks milestones',
  step5: 'Community votes on milestone fund release via DAO governance',
  step6: 'Approved funds released to Umanity Org wallet on-chain',
  step7: 'Umanity Org delivers to verified charities + posts proof on @umanity_xyz X',
  step8: 'All steps visible on blockchain via Solscan',
}
