/**
 * Seed Tapestry social data — profiles, posts, follows.
 * Calls Tapestry API directly to populate the social layer.
 *
 * Usage: npx tsx scripts/seed-tapestry.ts
 * Requires TAPESTRY_API_KEY in .env.local
 */

import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=["']?(.+?)["']?$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  }
}

const BASE_URL = 'https://api.usetapestry.dev/api/v1'
const API_KEY = process.env.TAPESTRY_API_KEY || ''

if (!API_KEY) {
  console.error('Missing TAPESTRY_API_KEY in environment')
  process.exit(1)
}

function buildUrl(path: string, params?: Record<string, string>) {
  const u = new URL(`${BASE_URL}${path}`)
  u.searchParams.set('apiKey', API_KEY)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v)
    }
  }
  return u.toString()
}

async function tapestryFetch(path: string, options?: RequestInit & { params?: Record<string, string> }) {
  const { params, ...fetchOpts } = options || {}
  const res = await fetch(buildUrl(path, params), {
    ...fetchOpts,
    headers: {
      'Content-Type': 'application/json',
      ...(fetchOpts?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Tapestry ${res.status}: ${text}`)
  }
  return res.json()
}

// Demo users with fake wallet addresses
const USERS = [
  { address: 'Seed1AishaGives111111111111111111111111111', username: 'aisha_gives', bio: 'Building a kinder world, one donation at a time. Humanitarian worker.' },
  { address: 'Seed2SolImpact2222222222222222222222222222222', username: 'sol_impact', bio: 'Crypto native turned impact maker. Solana maximalist for good.' },
  { address: 'Seed3CharityDev333333333333333333333333333333', username: 'charity_dev', bio: 'Full-stack dev by day, philanthropist by night. Open source everything.' },
  { address: 'Seed4NoorHope444444444444444444444444444444444', username: 'noor_hope', bio: 'Social worker. Proving that crypto can be a force for real change.' },
  { address: 'Seed5ImpactWhale55555555555555555555555555555', username: 'impact_whale', bio: 'Donating big. Voting bigger. Governance is how we stay accountable.' },
  { address: 'Seed6GreenSol666666666666666666666666666666666', username: 'green_sol', bio: 'Environmental causes on-chain. Every SOL counts for the planet.' },
  { address: 'Seed7DaoVoter777777777777777777777777777777777', username: 'dao_voter', bio: 'Governance nerd. Votes on every proposal. Accountability matters.' },
  { address: 'Seed8KindAnon888888888888888888888888888888888', username: 'kind_anon', bio: 'Anonymous giving. The impact speaks louder than the name.' },
  { address: 'Seed9Web3Heart99999999999999999999999999999999', username: 'web3_heart', bio: 'From DeFi degen to impact investor. Redemption arc complete.' },
  { address: 'Seed10MoonCharity0000000000000000000000000000', username: 'moon_charity', bio: 'Instead of mooning tokens, we moon donations. Social proof > speculation.' },
]

const POSTS = [
  { user: 'aisha_gives', content: 'Just donated 0.1 SOL to Palestine Red Crescent through Umanity. Every transaction is on-chain and verifiable. This is how crypto charity should work.', props: { type: 'donation_share', pool: 'palestine-red-crescent', amount: '0.1' } },
  { user: 'sol_impact', content: 'The governance system here is incredible. My donations earn voting power, and I actually get to decide when escrowed funds are released. Real stakes.', props: { type: 'manual' } },
  { user: 'charity_dev', content: 'Built on Solana with 2 Anchor programs and Tapestry social layer. The tech here is solid. On-chain escrow + community governance = transparency.', props: { type: 'manual' } },
  { user: 'noor_hope', content: 'Donated to Edhi Foundation pool. The milestone system means funds are released in phases, not all at once. Community votes on each release.', props: { type: 'donation_share', pool: 'edhi-foundation', amount: '0.05' } },
  { user: 'impact_whale', content: '0.5 SOL across three pools today. Palestine, Mercy Corps, and orphanage aid. My feed shows exactly where every SOL went. Transparent.', props: { type: 'donation_share', pool: 'mercy-corps', amount: '0.2' } },
  { user: 'green_sol', content: 'Donated to the animal rescue pool. Love that Umanity does physical deliveries for local causes and posts proof on X.', props: { type: 'donation_share', pool: 'animal-rescue', amount: '0.03' } },
  { user: 'dao_voter', content: 'Just voted on the Palestine milestone proposal. This is what crypto governance should be — votes that control real money, not just vibes.', props: { type: 'manual' } },
  { user: 'kind_anon', content: 'Impact NFTs are soulbound and non-transferable. Finally, proof of giving that cannot be traded. Bronze tier so far, aiming for Silver.', props: { type: 'manual' } },
  { user: 'web3_heart', content: 'The social feed changes everything. Seeing what my network donates makes me want to give more. Social proof > donation pages.', props: { type: 'manual' } },
  { user: 'moon_charity', content: 'Tipped @aisha_gives 0.01 SOL for being an amazing community member. The tipping system is a nice touch.', props: { type: 'tip', amount: '0.01' } },
  { user: 'aisha_gives', content: 'Donated to Turkish Red Crescent for earthquake relief. The Blinks feature means you can donate from any X feed without even visiting the app.', props: { type: 'donation_share', pool: 'turkish-red-crescent', amount: '0.05' } },
  { user: 'impact_whale', content: 'Created a governance proposal to release Phase 1 funds for Palestine Red Crescent. Community decides, not a single person. This is the way.', props: { type: 'manual' } },
  { user: 'sol_impact', content: 'The leaderboard is motivating. Healthy competition to see who can make the most impact. Currently top 5 and climbing.', props: { type: 'manual' } },
  { user: 'noor_hope', content: 'Impact Dare: I challenge @green_sol to donate 0.05 SOL to any pool this week! Lets keep the chain of giving going.', props: { type: 'dare', target: 'green_sol', amount: '0.05' } },
  { user: 'charity_dev', content: 'Love that every donation auto-posts to the feed. No manual sharing needed. Tapestry Protocol handles the social layer beautifully.', props: { type: 'manual' } },
  { user: 'green_sol', content: 'Accepted @noor_hope\'s Impact Dare! Just donated 0.05 SOL to orphanage aid. Passing the dare to @web3_heart next!', props: { type: 'dare_accepted', amount: '0.05' } },
  { user: 'web3_heart', content: 'Four donations in and I just earned my Silver impact NFT. On-chain proof that I am making a difference. Cannot fake this.', props: { type: 'manual' } },
  { user: 'kind_anon', content: 'The one-tap donation button is genius. 0.01 SOL with a single click. Lowest friction crypto giving I have ever seen.', props: { type: 'manual' } },
]

const FOLLOWS: [string, string][] = [
  ['aisha_gives', 'sol_impact'],
  ['aisha_gives', 'noor_hope'],
  ['aisha_gives', 'impact_whale'],
  ['sol_impact', 'aisha_gives'],
  ['sol_impact', 'charity_dev'],
  ['sol_impact', 'impact_whale'],
  ['charity_dev', 'sol_impact'],
  ['charity_dev', 'aisha_gives'],
  ['noor_hope', 'aisha_gives'],
  ['noor_hope', 'green_sol'],
  ['impact_whale', 'aisha_gives'],
  ['impact_whale', 'sol_impact'],
  ['impact_whale', 'dao_voter'],
  ['green_sol', 'noor_hope'],
  ['green_sol', 'web3_heart'],
  ['dao_voter', 'impact_whale'],
  ['dao_voter', 'charity_dev'],
  ['kind_anon', 'aisha_gives'],
  ['web3_heart', 'sol_impact'],
  ['web3_heart', 'green_sol'],
  ['moon_charity', 'aisha_gives'],
  ['moon_charity', 'impact_whale'],
]

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  console.log(`Seeding Tapestry social data (API key: ${API_KEY.slice(0, 8)}...)\n`)

  // 1. Create profiles
  console.log('=== Creating Tapestry Profiles ===')
  let profileCount = 0
  for (const user of USERS) {
    try {
      await tapestryFetch('/profiles/findOrCreate', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: user.address,
          username: user.username,
          bio: user.bio,
          blockchain: 'SOLANA',
        }),
      })
      console.log(`  + @${user.username}`)
      profileCount++
    } catch (e: any) {
      console.log(`  ~ @${user.username}: ${e.message}`)
    }
    await delay(300)
  }
  console.log(`Created ${profileCount}/${USERS.length} profiles\n`)

  // 2. Create posts
  console.log('=== Creating Posts ===')
  let postCount = 0
  for (const post of POSTS) {
    try {
      const id = `post_${post.user}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const props = [
        { key: 'content', value: post.content },
        { key: 'contentType', value: 'post' },
        ...Object.entries(post.props).map(([key, value]) => ({ key, value: String(value) })),
      ]

      await tapestryFetch('/contents/findOrCreate', {
        method: 'POST',
        body: JSON.stringify({
          id,
          profileId: post.user,
          properties: props,
        }),
      })
      console.log(`  + @${post.user}: "${post.content.slice(0, 50)}..."`)
      postCount++
    } catch (e: any) {
      console.log(`  ~ @${post.user}: ${e.message}`)
    }
    await delay(400)
  }
  console.log(`Created ${postCount}/${POSTS.length} posts\n`)

  // 3. Create follow relationships
  console.log('=== Creating Follows ===')
  let followCount = 0
  for (const [follower, followee] of FOLLOWS) {
    try {
      await tapestryFetch('/followers/add', {
        method: 'POST',
        body: JSON.stringify({
          startId: follower,
          endId: followee,
        }),
      })
      followCount++
    } catch (e: any) {
      // Non-blocking
    }
    await delay(200)
  }
  console.log(`Created ${followCount}/${FOLLOWS.length} follows\n`)

  // 4. Create some likes on posts
  console.log('=== Adding Likes ===')
  // Get some posts to like
  try {
    const data = await tapestryFetch('/contents/')
    const posts = data.contents || []
    let likeCount = 0
    for (let i = 0; i < Math.min(posts.length, 10); i++) {
      const likerIdx = (i + 3) % USERS.length
      try {
        await tapestryFetch(`/likes/${posts[i].id}`, {
          method: 'POST',
          body: JSON.stringify({ startId: USERS[likerIdx].username }),
        })
        likeCount++
      } catch {
        // Some may already be liked
      }
      await delay(200)
    }
    console.log(`Added ${likeCount} likes\n`)
  } catch (e: any) {
    console.log(`  ~ Likes failed: ${e.message}\n`)
  }

  console.log('=== Tapestry Seeding Complete ===')
  console.log(`Profiles: ${profileCount}, Posts: ${postCount}, Follows: ${followCount}`)
}

main().catch(console.error)
