/**
 * Set up missing tables in new Supabase project and seed demo data.
 * Uses the service_role key to run operations directly.
 *
 * Usage: npx tsx scripts/setup-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfiagdhfhhjdpsejwajv.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaWFnZGhmaGhqZHBzZWp3YWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg3MTUzMCwiZXhwIjoyMDg3NDQ3NTMwfQ.AhUfRPl-s-TJ3aqt7GkjQdK3HIcLSegeoDhCXmNjj1o'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Demo users
const USERS = [
  { address: 'Seed1AishaGives111111111111111111111111111', username: 'aisha_gives', display_name: 'Aisha Malik', bio: 'Building a kinder world, one donation at a time. Humanitarian worker.', reward_points: 250, total_donated: 0.15, donation_count: 3 },
  { address: 'Seed2SolImpact2222222222222222222222222222222', username: 'sol_impact', display_name: 'Sol Impact', bio: 'Crypto native turned impact maker. Solana maximalist for good.', reward_points: 180, total_donated: 0.08, donation_count: 2 },
  { address: 'Seed3CharityDev333333333333333333333333333333', username: 'charity_dev', display_name: 'Dev for Good', bio: 'Full-stack dev by day, philanthropist by night. Open source everything.', reward_points: 150, total_donated: 0.05, donation_count: 1 },
  { address: 'Seed4NoorHope444444444444444444444444444444444', username: 'noor_hope', display_name: 'Noor Al-Rashid', bio: 'Social worker. Proving that crypto can be a force for real change.', reward_points: 200, total_donated: 0.10, donation_count: 2 },
  { address: 'Seed5ImpactWhale55555555555555555555555555555', username: 'impact_whale', display_name: 'The Impact Whale', bio: 'Donating big. Voting bigger. Governance is how we stay accountable.', reward_points: 500, total_donated: 0.50, donation_count: 5 },
  { address: 'Seed6GreenSol666666666666666666666666666666666', username: 'green_sol', display_name: 'Green Solana', bio: 'Environmental causes on-chain. Every SOL counts for the planet.', reward_points: 130, total_donated: 0.06, donation_count: 2 },
  { address: 'Seed7DaoVoter777777777777777777777777777777777', username: 'dao_voter', display_name: 'DAO Citizen', bio: 'Governance nerd. Votes on every proposal. Accountability matters.', reward_points: 160, total_donated: 0.06, donation_count: 1 },
  { address: 'Seed8KindAnon888888888888888888888888888888888', username: 'kind_anon', display_name: 'Kind Anon', bio: 'Anonymous giving. The impact speaks louder than the name.', reward_points: 120, total_donated: 0.04, donation_count: 1 },
  { address: 'Seed9Web3Heart99999999999999999999999999999999', username: 'web3_heart', display_name: 'Web3 Heart', bio: 'From DeFi degen to impact investor. Redemption arc complete.', reward_points: 140, total_donated: 0.07, donation_count: 2 },
  { address: 'Seed10MoonCharity0000000000000000000000000000', username: 'moon_charity', display_name: 'Moon for Charity', bio: 'Instead of mooning tokens, we moon donations. Social proof > speculation.', reward_points: 110, total_donated: 0.03, donation_count: 1 },
]

async function main() {
  console.log('Setting up Supabase and seeding demo data...\n')

  // 1. Check if governance_proposals table exists by trying a select
  console.log('=== Checking Tables ===')
  const { error: propError } = await supabase.from('governance_proposals').select('count').limit(1)
  if (propError?.code === 'PGRST205' || propError?.message?.includes('not find')) {
    console.log('governance_proposals table missing — please run the SQL below in Supabase SQL Editor:')
    console.log(`
CREATE TABLE IF NOT EXISTS governance_proposals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  options JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closes_at TIMESTAMPTZ NOT NULL,
  campaign_id UUID,
  milestone_index INT,
  proposal_type TEXT DEFAULT 'general'
);

CREATE TABLE IF NOT EXISTS governance_votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proposal_id TEXT NOT NULL REFERENCES governance_proposals(id),
  voter_address TEXT NOT NULL,
  vote_option INTEGER NOT NULL,
  vote_weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, voter_address)
);

ALTER TABLE governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON governance_proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON governance_votes FOR ALL USING (true) WITH CHECK (true);
    `)
    console.log('Run the SQL above, then re-run this script.\n')
  } else {
    console.log('governance_proposals table exists')
  }

  // 2. Seed demo users
  console.log('\n=== Seeding Users ===')
  let userCount = 0
  for (const user of USERS) {
    const { error } = await supabase.from('users').upsert({
      ...user,
      total_received: 0,
      total_sent: 0,
      tip_count_received: 0,
      tip_count_sent: 0,
      is_active: true,
    }, { onConflict: 'address' })

    if (error) {
      // Try insert with username conflict handling
      const { error: err2 } = await supabase.from('users').upsert({
        ...user,
        total_received: 0,
        total_sent: 0,
        tip_count_received: 0,
        tip_count_sent: 0,
        is_active: true,
      }, { onConflict: 'username' })
      if (err2) {
        console.log(`  ~ @${user.username}: ${err2.message}`)
      } else {
        console.log(`  + @${user.username}`)
        userCount++
      }
    } else {
      console.log(`  + @${user.username}`)
      userCount++
    }
  }
  console.log(`Seeded ${userCount}/${USERS.length} users`)

  // 3. Seed governance proposals (if table exists)
  console.log('\n=== Seeding Governance Proposals ===')
  const { error: checkProp } = await supabase.from('governance_proposals').select('count').limit(1)
  if (!checkProp || !checkProp.message?.includes('not find')) {
    const proposals = [
      {
        creator_address: USERS[4].address, // impact_whale
        title: 'Release Phase 1 Funds — Palestine Red Crescent',
        description: 'Proposal to release the first milestone (40%) of escrowed funds for Palestine Red Crescent Society. Funds will be delivered by Umanity Org to verified charity trust. Proof of delivery will be posted on X.',
        options: ['Approve Release', 'Reject Release'],
        status: 'active',
        total_votes: 5,
        closes_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        proposal_type: 'fund_release',
      },
      {
        creator_address: USERS[4].address,
        title: 'Community Pool: Orphanage Winter Aid',
        description: 'Allocate funds from the orphanage aid pool for winter supplies — blankets, heaters, and warm clothing. Physical delivery by Umanity team with photo proof.',
        options: ['Approve', 'Reject', 'Defer to Next Month'],
        status: 'active',
        total_votes: 3,
        closes_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        proposal_type: 'general',
      },
      {
        creator_address: USERS[6].address, // dao_voter
        title: 'Increase Minimum Proposal Threshold',
        description: 'Should we increase the minimum points required to create governance proposals from 100 to 200? This would reduce spam but limit participation.',
        options: ['Yes, increase to 200', 'No, keep at 100'],
        status: 'active',
        total_votes: 4,
        closes_at: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
        proposal_type: 'general',
      },
    ]

    let proposalIds: string[] = []
    for (const prop of proposals) {
      const { data, error } = await supabase.from('governance_proposals').insert(prop).select().single()
      if (error) {
        console.log(`  ~ "${prop.title}": ${error.message}`)
      } else {
        console.log(`  + "${prop.title}"`)
        proposalIds.push(data.id)
      }
    }

    // Seed votes
    if (proposalIds.length > 0) {
      console.log('\n=== Seeding Votes ===')
      let voteCount = 0
      for (const propId of proposalIds) {
        for (let i = 0; i < 5; i++) {
          const voter = USERS[i]
          const { error } = await supabase.from('governance_votes').insert({
            proposal_id: propId,
            voter_address: voter.address,
            vote_option: i < 3 ? 0 : 1, // Most approve
            vote_weight: voter.reward_points,
          })
          if (!error) voteCount++
        }
      }
      console.log(`Cast ${voteCount} votes`)
    }
  }

  // 4. Seed pool donations (add more to existing)
  console.log('\n=== Seeding Pool Donations ===')
  const demoPoolDonations = [
    { donor: USERS[0].address, pool_id: 'palestine-red-crescent', pool_name: 'Palestine Red Crescent Society', amount: 0.10, signature: `seed_tx_1_${Date.now()}`, reward_points_earned: 100 },
    { donor: USERS[0].address, pool_id: 'turkish-red-crescent', pool_name: 'Turkish Red Crescent', amount: 0.05, signature: `seed_tx_2_${Date.now()}`, reward_points_earned: 50 },
    { donor: USERS[1].address, pool_id: 'mercy-corps', pool_name: 'Mercy Corps', amount: 0.05, signature: `seed_tx_3_${Date.now()}`, reward_points_earned: 50 },
    { donor: USERS[3].address, pool_id: 'edhi-foundation', pool_name: 'Edhi Foundation', amount: 0.05, signature: `seed_tx_4_${Date.now()}`, reward_points_earned: 50 },
    { donor: USERS[4].address, pool_id: 'palestine-red-crescent', pool_name: 'Palestine Red Crescent Society', amount: 0.20, signature: `seed_tx_5_${Date.now()}`, reward_points_earned: 200 },
    { donor: USERS[4].address, pool_id: 'mercy-corps', pool_name: 'Mercy Corps', amount: 0.15, signature: `seed_tx_6_${Date.now()}`, reward_points_earned: 150 },
    { donor: USERS[4].address, pool_id: 'orphanage-aid', pool_name: 'Local Orphanage Aid', amount: 0.10, signature: `seed_tx_7_${Date.now()}`, reward_points_earned: 100 },
    { donor: USERS[5].address, pool_id: 'animal-rescue', pool_name: 'Street Animal Rescue', amount: 0.03, signature: `seed_tx_8_${Date.now()}`, reward_points_earned: 30 },
    { donor: USERS[8].address, pool_id: 'edhi-foundation', pool_name: 'Edhi Foundation', amount: 0.04, signature: `seed_tx_9_${Date.now()}`, reward_points_earned: 40 },
    { donor: USERS[9].address, pool_id: 'turkish-red-crescent', pool_name: 'Turkish Red Crescent', amount: 0.03, signature: `seed_tx_10_${Date.now()}`, reward_points_earned: 30 },
  ]

  let donationCount = 0
  for (const d of demoPoolDonations) {
    const { error } = await supabase.from('pool_donations').insert({
      id: `seed_donation_${donationCount}_${Date.now()}`,
      ...d,
    })
    if (!error) donationCount++
    else console.log(`  ~ donation: ${error.message}`)
  }
  console.log(`Seeded ${donationCount} pool donations`)

  // 5. Seed impact NFTs
  console.log('\n=== Seeding Impact NFTs ===')
  const nfts = [
    { owner_address: USERS[4].address, cause_name: 'Palestine Red Crescent Society', amount: 0.20, tier: 'Silver' },
    { owner_address: USERS[4].address, cause_name: 'Mercy Corps', amount: 0.15, tier: 'Silver' },
    { owner_address: USERS[0].address, cause_name: 'Palestine Red Crescent Society', amount: 0.10, tier: 'Silver' },
    { owner_address: USERS[3].address, cause_name: 'Edhi Foundation', amount: 0.05, tier: 'Bronze' },
    { owner_address: USERS[1].address, cause_name: 'Mercy Corps', amount: 0.05, tier: 'Bronze' },
    { owner_address: USERS[8].address, cause_name: 'Edhi Foundation', amount: 0.04, tier: 'Bronze' },
  ]

  let nftCount = 0
  for (const nft of nfts) {
    const { error } = await supabase.from('impact_nfts').insert(nft)
    if (!error) nftCount++
    else console.log(`  ~ nft: ${error.message}`)
  }
  console.log(`Seeded ${nftCount} impact NFTs`)

  console.log('\n=== Done ===')
}

main().catch(console.error)
