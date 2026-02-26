/**
 * Seed hackathon demo data — creates Tapestry profiles, follow relationships,
 * feed posts, and governance proposals via existing API routes.
 *
 * Usage: NEXT_PUBLIC_APP_URL=https://umanity-solana.vercel.app npx tsx scripts/seed-hackathon.ts
 *   or:  NEXT_PUBLIC_APP_URL=http://localhost:3000 npx tsx scripts/seed-hackathon.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ===== Demo Users =====
const USERS = [
  { username: 'aisha_gives', displayName: 'Aisha Malik', bio: 'Building a kinder world, one donation at a time. Humanitarian worker.' },
  { username: 'sol_impact', displayName: 'Sol Impact', bio: 'Crypto native turned impact maker. Solana maximalist for good.' },
  { username: 'charity_dev', displayName: 'Dev for Good', bio: 'Full-stack dev by day, philanthropist by night. Open source everything.' },
  { username: 'noor_hope', displayName: 'Noor Al-Rashid', bio: 'Social worker. Proving that crypto can be a force for real change.' },
  { username: 'impact_whale', displayName: 'The Impact Whale', bio: 'Donating big. Voting bigger. Governance is how we stay accountable.' },
  { username: 'green_sol', displayName: 'Green Solana', bio: 'Environmental causes on-chain. Every SOL counts for the planet.' },
  { username: 'dao_voter', displayName: 'DAO Citizen', bio: 'Governance nerd. Votes on every proposal. Accountability matters.' },
  { username: 'kind_anon', displayName: 'Kind Anon', bio: 'Anonymous giving. The impact speaks louder than the name.' },
  { username: 'web3_heart', displayName: 'Web3 Heart', bio: 'From DeFi degen to impact investor. Redemption arc complete.' },
  { username: 'moon_charity', displayName: 'Moon for Charity', bio: 'Instead of mooning tokens, we moon donations. Social proof > speculation.' },
]

// Generate deterministic fake wallet addresses (base58-ish for each user)
function fakeAddress(seed: string): string {
  // Create a deterministic but realistic-looking base58 address
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }
  let addr = ''
  for (let i = 0; i < 44; i++) {
    hash = ((hash << 5) - hash) + i
    hash |= 0
    addr += chars[Math.abs(hash) % chars.length]
  }
  return addr
}

// ===== Feed Posts =====
const POSTS = [
  { user: 'aisha_gives', content: 'Just donated 0.1 SOL to Palestine Red Crescent through Umanity. Every transaction is on-chain and verifiable. This is how crypto charity should work.', props: { type: 'donation_share', pool: 'palestine-red-crescent', amount: 0.1 } },
  { user: 'sol_impact', content: 'The governance system here is incredible. My donations earn voting power, and I actually get to decide when escrowed funds are released. Real stakes.', props: { type: 'manual' } },
  { user: 'charity_dev', content: 'Built on Solana with 2 Anchor programs and Tapestry social layer. The tech here is solid. On-chain escrow + community governance = transparency.', props: { type: 'manual' } },
  { user: 'noor_hope', content: 'Donated to Edhi Foundation pool. The milestone system means funds are released in phases, not all at once. Community votes on each release.', props: { type: 'donation_share', pool: 'edhi-foundation', amount: 0.05 } },
  { user: 'impact_whale', content: '0.5 SOL across three pools today. Palestine, Mercy Corps, and orphanage aid. My feed shows exactly where every SOL went. Transparent.', props: { type: 'donation_share', pool: 'mercy-corps', amount: 0.2 } },
  { user: 'green_sol', content: 'Donated to the animal rescue pool. Love that Umanity does physical deliveries for local causes and posts proof on X.', props: { type: 'donation_share', pool: 'animal-rescue', amount: 0.03 } },
  { user: 'dao_voter', content: 'Just voted on the Palestine milestone proposal. This is what crypto governance should be — votes that control real money, not just vibes.', props: { type: 'manual' } },
  { user: 'kind_anon', content: 'Impact NFTs are soulbound and non-transferable. Finally, proof of giving that can\'t be traded. Bronze tier so far, aiming for Silver.', props: { type: 'manual' } },
  { user: 'web3_heart', content: 'The social feed changes everything. Seeing what my network donates makes me want to give more. Social proof > donation pages.', props: { type: 'manual' } },
  { user: 'moon_charity', content: 'Tipped @aisha_gives 0.01 SOL for being an amazing community member. The tipping system is a nice touch.', props: { type: 'tip', amount: 0.01 } },
  { user: 'aisha_gives', content: 'Donated to Turkish Red Crescent for earthquake relief. The Blinks feature means you can donate from any X feed without even visiting the app.', props: { type: 'donation_share', pool: 'turkish-red-crescent', amount: 0.05 } },
  { user: 'impact_whale', content: 'Created a governance proposal to release Phase 1 funds for Palestine Red Crescent. Community decides, not a single person. This is the way.', props: { type: 'manual' } },
  { user: 'sol_impact', content: 'The leaderboard is motivating. Healthy competition to see who can make the most impact. Currently top 5 and climbing.', props: { type: 'manual' } },
  { user: 'noor_hope', content: 'Impact Dare: I challenge @green_sol to donate 0.05 SOL to any pool this week! Let\'s keep the chain of giving going.', props: { type: 'dare', target: 'green_sol', amount: 0.05 } },
  { user: 'charity_dev', content: 'Love that every donation auto-posts to the feed. No manual sharing needed. Tapestry Protocol handles the social layer beautifully.', props: { type: 'manual' } },
  { user: 'green_sol', content: 'Accepted @noor_hope\'s Impact Dare! Just donated 0.05 SOL to orphanage aid. Passing the dare to @web3_heart next!', props: { type: 'dare_accepted', amount: 0.05 } },
  { user: 'web3_heart', content: 'Four donations in and I just earned my Silver impact NFT. On-chain proof that I\'m making a difference. Can\'t fake this.', props: { type: 'manual' } },
  { user: 'kind_anon', content: 'The one-tap donation button is genius. 0.01 SOL with a single click. Lowest friction crypto giving I\'ve ever seen.', props: { type: 'manual' } },
]

// ===== Follow relationships =====
const FOLLOWS: [string, string][] = [
  ['aisha_gives', 'sol_impact'],
  ['aisha_gives', 'noor_hope'],
  ['aisha_gives', 'impact_whale'],
  ['sol_impact', 'aisha_gives'],
  ['sol_impact', 'charity_dev'],
  ['sol_impact', 'impact_whale'],
  ['charity_dev', 'sol_impact'],
  ['charity_dev', 'aisha_gives'],
  ['charity_dev', 'dao_voter'],
  ['noor_hope', 'aisha_gives'],
  ['noor_hope', 'green_sol'],
  ['noor_hope', 'kind_anon'],
  ['impact_whale', 'aisha_gives'],
  ['impact_whale', 'sol_impact'],
  ['impact_whale', 'dao_voter'],
  ['impact_whale', 'charity_dev'],
  ['green_sol', 'noor_hope'],
  ['green_sol', 'web3_heart'],
  ['dao_voter', 'impact_whale'],
  ['dao_voter', 'charity_dev'],
  ['kind_anon', 'aisha_gives'],
  ['kind_anon', 'noor_hope'],
  ['web3_heart', 'sol_impact'],
  ['web3_heart', 'green_sol'],
  ['web3_heart', 'moon_charity'],
  ['moon_charity', 'aisha_gives'],
  ['moon_charity', 'impact_whale'],
  ['moon_charity', 'web3_heart'],
]

// ===== Governance Proposals =====
const PROPOSALS = [
  {
    title: 'Release Phase 1 Funds — Palestine Red Crescent',
    description: 'Proposal to release the first milestone (40%) of escrowed funds for Palestine Red Crescent Society. Funds will be delivered by Umanity Org to verified charity trust. Proof of delivery will be posted on X.',
    options: ['Approve Release', 'Reject Release'],
    durationHours: 72,
    proposalType: 'fund_release',
  },
  {
    title: 'Community Pool: Orphanage Winter Aid',
    description: 'Allocate funds from the orphanage aid pool for winter supplies — blankets, heaters, and warm clothing. Physical delivery by Umanity team with photo proof.',
    options: ['Approve', 'Reject', 'Defer to Next Month'],
    durationHours: 48,
  },
  {
    title: 'Increase Minimum Proposal Threshold',
    description: 'Should we increase the minimum points required to create governance proposals from 100 to 200? This would reduce spam but limit participation.',
    options: ['Yes, increase to 200', 'No, keep at 100'],
    durationHours: 96,
  },
]

async function api(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function main() {
  console.log(`Seeding hackathon data on ${BASE_URL}\n`)

  // 1. Register users
  console.log('=== Registering Users ===')
  let registered = 0
  for (const user of USERS) {
    const address = fakeAddress(user.username)
    try {
      const res = await api('/api/register', {
        address,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
      })
      if (res.success) {
        console.log(`  + @${user.username}`)
        registered++
      } else {
        console.log(`  ~ @${user.username}: ${res.error || 'exists'}`)
      }
    } catch (e: any) {
      console.log(`  x @${user.username}: ${e.message}`)
    }
    await delay(300)
  }
  console.log(`Registered ${registered}/${USERS.length} users\n`)

  // 2. Follow relationships
  console.log('=== Creating Follow Relationships ===')
  let followed = 0
  for (const [follower, followee] of FOLLOWS) {
    try {
      const res = await api('/api/social/follow', { follower, followee })
      if (res.success || res.message) {
        followed++
      }
    } catch {
      // Non-blocking
    }
    await delay(200)
  }
  console.log(`Created ${followed}/${FOLLOWS.length} follow relationships\n`)

  // 3. Create posts
  console.log('=== Creating Feed Posts ===')
  let posted = 0
  for (const post of POSTS) {
    try {
      const res = await api('/api/social/post', {
        username: post.user,
        content: post.content,
        properties: post.props,
      })
      if (res.success) {
        console.log(`  + @${post.user}: "${post.content.slice(0, 50)}..."`)
        posted++
      } else {
        console.log(`  ~ @${post.user}: ${res.error || 'failed'}`)
      }
    } catch (e: any) {
      console.log(`  x @${post.user}: ${e.message}`)
    }
    await delay(400)
  }
  console.log(`Created ${posted}/${POSTS.length} posts\n`)

  // 4. Create governance proposals
  console.log('=== Creating Governance Proposals ===')
  const creatorAddress = fakeAddress('impact_whale')
  let proposalIds: string[] = []
  for (const prop of PROPOSALS) {
    try {
      const res = await api('/api/governance/proposals', {
        creatorAddress,
        ...prop,
      })
      if (res.success && res.proposal) {
        console.log(`  + "${prop.title}"`)
        proposalIds.push(res.proposal.id)
      } else {
        console.log(`  ~ "${prop.title}": ${res.error || 'failed'}`)
      }
    } catch (e: any) {
      console.log(`  x "${prop.title}": ${e.message}`)
    }
    await delay(300)
  }
  console.log(`Created ${proposalIds.length}/${PROPOSALS.length} proposals\n`)

  // 5. Cast votes on proposals
  if (proposalIds.length > 0) {
    console.log('=== Casting Votes ===')
    const voters = USERS.slice(0, 6) // First 6 users vote
    let votes = 0
    for (const proposalId of proposalIds) {
      for (let i = 0; i < voters.length; i++) {
        const voter = voters[i]
        const address = fakeAddress(voter.username)
        try {
          const voteOption = i < 4 ? 0 : 1 // Most vote for option 0 (approve)
          const res = await api('/api/governance/vote', {
            proposalId,
            voterAddress: address,
            voteOption,
          })
          if (res.success) votes++
        } catch {
          // Non-blocking
        }
        await delay(200)
      }
    }
    console.log(`Cast ${votes} votes\n`)
  }

  console.log('=== Seeding Complete ===')
  console.log(`Users: ${registered}, Follows: ${followed}, Posts: ${posted}, Proposals: ${proposalIds.length}`)
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(console.error)
