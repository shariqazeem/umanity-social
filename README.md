# RISEN - Resurrecting Purpose on Solana

**Onchain social died because it was about clout. DAOs died because governance had no stakes. NFTs died because they were speculative JPEGs.**

**RISEN resurrects all three by giving them a reason to exist** - community-driven philanthropy where your social graph is your impact network, your votes decide where funds go, and your NFTs prove you made a difference.

Built for the [Solana Graveyard Hackathon](https://www.colosseum.org/).

## Resurrected Tracks

### Social (Tapestry) - $5K Bounty Track
- Tapestry-powered social profiles and feed
- Donations auto-post to social feed
- Follow donors, like and comment on impact posts
- Your social graph = your impact network

### DAO Governance (Realms) - $5K Bounty Track
- Proposal creation and weighted voting
- Vote weight = your donation reward points
- Community decides where funds go
- Real stakes governance (not empty votes)

### Impact NFTs (Bubblegum V2) - $2.5K Bounty Track
- Soulbound impact certificates earned through donations
- Tiered system: Bronze / Silver / Gold / Diamond
- Non-transferable proof of purpose
- Not speculative JPEGs - proof you made a difference

## Features

- **One-Tap Donations** - $2 instant donations on Solana
- **Cause Pools** - Donate to Medical, Education, Disaster Relief, Water
- **Community Tipping** - Send SOL tips to fellow community members
- **Social Feed** - Tapestry-powered social layer for philanthropy
- **DAO Voting** - Create and vote on proposals for fund allocation
- **Impact Gallery** - Soulbound NFT collection proving your impact
- **Leaderboards** - Real-time rankings by contribution and activity
- **Reward Points** - 1 SOL = 1,000 points across all activities

## Tech Stack

- **Blockchain**: Solana (Devnet)
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Social**: Tapestry Protocol API
- **Governance**: Realms/SPL Governance (Supabase hybrid)
- **NFTs**: Metaplex Bubblegum V2 (compressed, soulbound)
- **Database**: Supabase (PostgreSQL)
- **Smart Contracts**: Anchor (Rust)
- **Deployment**: Vercel

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

# Run Supabase migrations (add governance + NFT tables)
# governance_proposals, governance_votes, impact_nfts

# Run development server
npm run dev
```

## Supabase Tables (New)

```sql
-- Governance
CREATE TABLE governance_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  options JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closes_at TIMESTAMPTZ NOT NULL,
  realm_proposal_pubkey TEXT
);

CREATE TABLE governance_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES governance_proposals(id),
  voter_address TEXT NOT NULL,
  vote_option INTEGER NOT NULL,
  vote_weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, voter_address)
);

-- Impact NFTs
CREATE TABLE impact_nfts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_address TEXT NOT NULL,
  donation_id TEXT,
  cause_name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  tier TEXT NOT NULL,
  mint_signature TEXT,
  metadata_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Deployed Programs (Devnet)

- **Donations**: `BW8QEjNXreRdzHoQP8C2uRZaZu5pqZD6VK4f6yidpQ1P`
- **Tips**: `5hkEjoNLyEpgKezYBvU2HF1FgBHfKGqumBaT48moUwqJ`

## Architecture

```
User donates → On-chain TX → Supabase record
                           → Tapestry social post (auto)
                           → Impact NFT minted (auto)
                           → Reward points earned → Voting power
```

## License

MIT
