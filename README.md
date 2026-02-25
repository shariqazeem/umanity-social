# Umanity — The Social Impact Network on Solana

**Umanity** is a community-driven philanthropy platform on Solana. Your social graph is your impact network, your votes decide where funds go, and your NFTs prove you made a difference.

Built for the [Solana Graveyard Hackathon](https://www.colosseum.org/).

## How It Works

1. **Donate** — SOL goes to on-chain escrow vaults via Anchor programs
2. **Govern** — Community votes on milestone-based fund releases
3. **Deliver** — Umanity Org receives approved funds and delivers to verified charities
4. **Prove** — Every delivery documented with proof on [@umanity_xyz](https://x.com/umanity_xyz)
5. **Earn** — Impact certificates + reward points for every contribution

All transactions visible on-chain via [Solscan](https://solscan.io/).

## Resurrected Tracks

### Social (Tapestry) — $5K Bounty Track
- Tapestry-powered social profiles and feed
- Donations auto-post to social feed with share-to-X
- Follow donors, like and comment on impact posts
- Social proof badges showing who in your network donated

### Community Escrow Governance
- Donation-weighted community governance controlling on-chain escrow releases via Anchor program
- Milestone-based fund release proposals
- Vote weight = your donation reward points
- Tier-gated governance (Bloom+ tier to see proposals)
- Execute proposals to approve/reject fund releases
- Real stakes governance — votes control real money

### Impact Certificates
- Impact proof certificates earned through donations
- Tiered system: Bronze / Silver / Gold / Diamond
- Cause name, amount, and tier-colored cards
- Non-transferable proof of purpose

## Active Charity Pools

| Pool | Type | Category |
|------|------|----------|
| Palestine Red Crescent Society | Verified charity trust | Healthcare |
| Turkish Red Crescent (Kizilay) | Verified charity trust | Disaster Relief |
| Mercy Corps | Verified charity trust | Food & Water |
| Edhi Foundation | Verified charity trust | Humanitarian |
| Local Orphanage Aid | Physical — Umanity delivers | Children |
| Street Animal Rescue | Physical — Umanity delivers | Animal Welfare |

All funds route through Umanity Org wallet for verified delivery. Proof posted on X.

## Features

- **One-Tap Donations** — 0.01 SOL instant on-chain donation
- **6 Charity Pools** — Mix of verified trusts + physical causes
- **On-Chain Escrow** — Funds held in vault PDAs until community approves release
- **Milestone System** — 3 milestones per campaign, percentage-based releases
- **Solana Blinks** — Donate from any X feed or web page via Solana Actions
- **Community Governance** — Create & vote on fund release proposals
- **Community Tipping** — Send SOL tips to fellow community members
- **Social Feed** — Tapestry-powered social layer for philanthropy
- **Impact Certificates** — Tiered certificates with tier-colored cards
- **Leaderboards** — Real-time rankings by contribution
- **Reward Points** — 1 SOL = 1,000 points → voting power
- **Share to X** — Share donations directly to X from the app
- **4-Step Onboarding** — Username, follow suggestions, bio, profile preview

## Tech Stack

- **Blockchain**: Solana (Devnet)
- **Smart Contracts**: Anchor Framework (Rust) — 2 programs, 9 instructions
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Social**: Tapestry Protocol API
- **Governance**: DAO with weighted voting (Supabase + on-chain hybrid)
- **Impact Certificates**: Donation records with tier system (Supabase)
- **Blinks**: Solana Actions API v2.1.3
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Deployed Programs (Devnet)

- **Donations**: `9JBsHFy9rQhjcPiKkFzqxpUV9HZyZ1ZmE4AWXc1Kiys1`
- **Tips**: `DBzVAJHgiyVWZMdj1Q2vHUfL1wW4nVag3AqJ5FKmxtau`

## Architecture

```
Donation Flow:
  User donates SOL
    → Anchor program transfers to on-chain vault PDA
    → DonationRecord created on-chain
    → Supabase syncs + checks milestones
    → Auto-posts to Tapestry social feed
    → Impact certificate created
    → Reward points earned → Voting power

Escrow Flow:
  Pool receives donations → Campaign tracks total_raised
    → Milestone threshold crossed → Auto-creates governance proposal
    → Community votes (weighted by donation history)
    → Proposal executed → Milestone approved/rejected
    → Approved funds released from vault → Umanity Org wallet
    → Umanity delivers to charity → Posts proof on X

Blinks Flow:
  User sees Blink on X/web → GET returns Action metadata
    → User picks amount → POST builds partially-signed transaction
    → User signs in wallet → On-chain donation complete
```

## Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   TAPESTRY_API_KEY
#   NEXT_PUBLIC_HELIUS_API_KEY

# Run Supabase migrations
# See supabase/campaigns.sql for schema

# Initialize on-chain pools
npx tsx scripts/init-pools.ts

# Seed campaigns with milestones
node --env-file=.env.local -e "require('child_process').execSync('npx tsx scripts/init-campaigns.ts', {stdio:'inherit', env:process.env})"

# Seed demo donations (real on-chain)
npx tsx scripts/seed-demo.ts

# Run development server
npm run dev
```

## Blinks (Solana Actions)

Umanity supports Solana Blinks for donating from any X feed or website:

```
GET  /api/actions/donate/{poolId}  → Action metadata (title, amounts, description)
POST /api/actions/donate/{poolId}  → Partially-signed transaction
```

Pool IDs: `palestine-red-crescent`, `turkish-red-crescent`, `mercy-corps`, `edhi-foundation`, `orphanage-aid`, `animal-rescue`

## Tests

```bash
# Run E2E tests (requires dev server running + devnet)
node --env-file=.env.local -e "require('child_process').execSync('npx tsx tests/e2e-deep.ts', {stdio:'inherit', env:process.env})"
```

51 tests covering: IDL validation, on-chain operations, Supabase queries, API endpoints, and Blinks.

## License

MIT
