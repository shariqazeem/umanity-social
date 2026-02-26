# Umanity — Crypto Charity, Resurrected

> The social impact network on Solana. Transparent donations, community governance, social proof.

**Live Demo:** [umanity-solana.vercel.app](https://umanity-solana.vercel.app)
**Demo Video:** [Coming soon]
**Built for:** [Solana Graveyard Hackathon](https://www.colosseum.org/) — Resurrecting what crypto killed.

---

## The Graveyard

Three crypto charity trends died. Here's why:

| What Died | Why It Failed |
|-----------|--------------|
| **GoFundMe Clones** | No transparency. Off-chain. No community. Donate and hope. |
| **Charity Tokens** | Rug pulls. No accountability. Speculation disguised as giving. |
| **Donation Pages** | Zero follow-up. No social proof. Donate once, forgotten forever. |

## The Resurrection

Umanity brings crypto charity back from the dead with three innovations:

### 1. Social-First Feed — "Social Proof > Donation Pages"
Your feed shows what your network is giving. Donations become stories. Follows drive accountability. Every donation auto-posts to the social feed. Built on **Tapestry Protocol** with 29 social API integrations — profiles, follows, feed, likes, comments, search, Impact Dares, referrals, leaderboards, and social graph.

### 2. DAO Governance — "Community Escrow > Trust Me Bro"
Donations go to on-chain escrow vaults via Anchor programs. Community members earn voting power through donations. Governance proposals control when escrowed funds are released. **Votes control real money** — not just vibes. Milestone-based releases ensure accountability.

### 3. Impact NFTs — "On-Chain Proof > Email Receipts"
Soulbound, non-transferable proof of impact. Tiered certificates from Bronze to Diamond. Permanent on Solana. No speculation — pure proof of purpose.

---

## Technical Depth

| Component | Detail |
|-----------|--------|
| **Anchor Programs** | 2 programs, 13 instructions, 856 lines of Rust |
| **Tapestry Integrations** | 29 social functions (profiles, feed, follows, likes, comments, search, dares, referrals) |
| **API Routes** | 42 Next.js API routes |
| **Solana Blinks** | 6 donation Blinks (one per charity pool) — donate from any X feed |
| **E2E Tests** | 51 tests covering IDL validation, on-chain ops, Supabase, APIs, and Blinks |

### Deployed Programs (Devnet)

- **Donations**: [`9JBsHFy9rQhjcPiKkFzqxpUV9HZyZ1ZmE4AWXc1Kiys1`](https://solscan.io/account/9JBsHFy9rQhjcPiKkFzqxpUV9HZyZ1ZmE4AWXc1Kiys1?cluster=devnet)
- **Tips**: [`DBzVAJHgiyVWZMdj1Q2vHUfL1wW4nVag3AqJ5FKmxtau`](https://solscan.io/account/DBzVAJHgiyVWZMdj1Q2vHUfL1wW4nVag3AqJ5FKmxtau?cluster=devnet)

### Tech Stack

- **Blockchain**: Solana (Devnet)
- **Smart Contracts**: Anchor Framework (Rust)
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Social Layer**: Tapestry Protocol API
- **Database**: Supabase (PostgreSQL)
- **Blinks**: Solana Actions API v2.1.3
- **Deployment**: Vercel

---

## Architecture Flow

```
Donation Flow:
  User donates SOL → Anchor program → On-chain vault PDA
    → DonationRecord created on-chain
    → Supabase syncs + checks milestones
    → Auto-posts to Tapestry social feed
    → Impact certificate created
    → Reward points earned → Voting power

Escrow + Governance Flow:
  Pool receives donations → Campaign tracks total_raised
    → Milestone threshold crossed → Auto-creates governance proposal
    → Community votes (weighted by donation history)
    → Proposal executed → Milestone approved/rejected
    → Approved funds released from vault → Umanity Org wallet
    → Charity delivery → Proof posted on X (@umanity_xyz)

Blinks Flow:
  User sees Blink on X/web → GET returns Action metadata
    → User picks amount → POST builds partially-signed transaction
    → User signs in wallet → On-chain donation complete
```

---

## Bounty Tracks

### Main Track — "Graveyard"
Umanity resurrects crypto charity by solving the three problems that killed it:
- **Transparency**: On-chain escrow vaults, community governance, Solscan-verifiable transactions
- **Accountability**: Milestone-based fund releases controlled by community votes
- **Social Proof**: Tapestry-powered social feed where giving IS the content

### Tapestry Social Track
Deep integration with Tapestry Protocol across the entire app:
- **29 Tapestry functions** covering the full social stack
- User profiles with bio, followers, following
- Social feed with auto-posting on donations
- Follow system with suggested follows and social graph
- Like/comment system on all posts
- Impact Dares — challenge friends to donate
- Referral system with tracking
- Social leaderboards
- Content search and discovery
- Mutual follows detection
- Activity feed powered by social graph

---

## Active Charity Pools

| Pool | Type | Category |
|------|------|----------|
| Palestine Red Crescent Society | Verified charity trust | Healthcare |
| Turkish Red Crescent (Kizilay) | Verified charity trust | Disaster Relief |
| Mercy Corps | Verified charity trust | Food & Water |
| Edhi Foundation | Verified charity trust | Humanitarian |
| Local Orphanage Aid | Physical — Umanity delivers | Children |
| Street Animal Rescue | Physical — Umanity delivers | Animal Welfare |

---

## How to Test

### Quick tour (no wallet needed):
1. Visit [umanity-solana.vercel.app](https://umanity-solana.vercel.app)
2. Click **"Explore as Guest"** to browse the full app read-only
3. Browse all 5 tabs: Feed, Explore, Donate, Govern, Profile

### Full experience (with wallet):
1. Install [Phantom](https://phantom.app) → Switch to **Devnet** (Settings → Developer → Testnet Mode)
2. Get devnet SOL from [faucet.solana.com](https://faucet.solana.com)
3. Visit the app → Connect wallet → Complete 4-step onboarding
4. **Donate**: Use One-Tap (0.01 SOL) or pick a charity pool
5. **Feed**: See your donation auto-posted, like/comment on posts
6. **Govern**: Vote on fund release proposals (need 100+ points to create)
7. **Profile**: See your impact score, NFTs, social graph, and donation streak

### Blinks:
```
GET  /api/actions/donate/{poolId}  → Returns Action metadata
POST /api/actions/donate/{poolId}  → Returns partially-signed transaction
```
Pool IDs: `palestine-red-crescent`, `turkish-red-crescent`, `mercy-corps`, `edhi-foundation`, `orphanage-aid`, `animal-rescue`

---

## Features

- **One-Tap Donations** — 0.01 SOL instant on-chain donation
- **6 Charity Pools** — Mix of verified trusts + physical causes
- **On-Chain Escrow** — Funds held in vault PDAs until community approves release
- **Milestone System** — 3 milestones per campaign, percentage-based releases
- **Solana Blinks** — Donate from any X feed or web page via Solana Actions
- **Community Governance** — Create & vote on fund release proposals
- **Community Tipping** — Send SOL tips to fellow community members
- **Social Feed** — Tapestry-powered social layer for philanthropy
- **Impact Dares** — Challenge friends to donate
- **Impact Certificates** — Tiered (Bronze/Silver/Gold/Diamond) soulbound NFTs
- **Leaderboards** — Real-time rankings by contribution
- **Reward Points** — 1 SOL = 1,000 points → voting power
- **Share to X** — Share donations directly to X from the app
- **4-Step Onboarding** — Username, follow suggestions, bio, profile preview
- **Guest Mode** — Full app browsing without a wallet (for judges)
- **Referral System** — Invite links with on-chain tracking
- **Social Graph** — Followers, following, mutual connections

---

## Setup

```bash
npm install

# Environment variables
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#          TAPESTRY_API_KEY, NEXT_PUBLIC_HELIUS_API_KEY

# Initialize on-chain pools
npx tsx scripts/init-pools.ts

# Seed campaigns with milestones
npx tsx scripts/init-campaigns.ts

# Seed demo donations (real on-chain)
npx tsx scripts/seed-demo.ts

# Seed social data (users, posts, follows, proposals)
NEXT_PUBLIC_APP_URL=http://localhost:3000 npx tsx scripts/seed-hackathon.ts

npm run dev
```

## Tests

```bash
node --env-file=.env.local -e "require('child_process').execSync('npx tsx tests/e2e-deep.ts', {stdio:'inherit', env:process.env})"
```

51 tests covering: IDL validation, on-chain operations, Supabase queries, API endpoints, and Blinks.

---

## License

MIT
