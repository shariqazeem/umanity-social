/**
 * Umanity — Deep E2E Test Suite
 *
 * Tests:
 *   1. On-chain: Pool read, Campaign PDA derivation, Donate, Escrow create_campaign + milestones
 *   2. API: Campaigns, Milestones, NFT Gallery, Smart Feed, Governance, Donate Sync
 *   3. Blinks: GET action metadata, POST transaction build
 *   4. DAO: Proposal creation, vote, milestone proposal auto-creation
 *
 * Usage: node --env-file=.env.local -e "require('child_process').execSync('npx tsx tests/e2e-deep.ts', {stdio:'inherit', env:process.env})"
 */

import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey('9JBsHFy9rQhjcPiKkFzqxpUV9HZyZ1ZmE4AWXc1Kiys1')
const BASE_URL = 'http://localhost:3000'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Load wallet
const walletPath = path.resolve(process.env.HOME || '~', '.config/solana/devnet.json')
const raw = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
const payer = Keypair.fromSecretKey(Uint8Array.from(raw))
const connection = new Connection(RPC_URL, 'confirmed')
const wallet = new anchor.Wallet(payer)
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })

// Load IDL
const idlPath = path.resolve(__dirname, '../target/idl/umanity_donations.json')
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))
const program = new anchor.Program(idl, provider)

// ===== Test helpers =====
let passed = 0
let failed = 0
let skipped = 0

function ok(name: string, detail?: string) {
  passed++
  console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name: string, err: any) {
  failed++
  console.log(`  \x1b[31m✗\x1b[0m ${name} — ${err?.message || err}`)
}

function skip(name: string, reason: string) {
  skipped++
  console.log(`  \x1b[33m○\x1b[0m ${name} — ${reason}`)
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`)
}

// Check if dev server is running
async function isDevServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/pools`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

// ===== ON-CHAIN TESTS =====
async function testOnChain() {
  console.log('\n\x1b[1m━━━ ON-CHAIN TESTS ━━━\x1b[0m')

  // 1. Read existing pools
  try {
    const [poolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), Buffer.from('palestine-red-crescent')],
      PROGRAM_ID
    )
    const poolAccount = await (program.account as any).pool.fetch(poolPDA)
    assert(poolAccount.name === 'palestine-red-crescent', 'Pool name mismatch')
    assert(poolAccount.isActive === true, 'Pool should be active')
    assert(poolAccount.authority.toBase58() === payer.publicKey.toBase58(), 'Authority mismatch')
    ok('Read pool: palestine-red-crescent', `donated=${poolAccount.totalDonated.toString()}, donors=${poolAccount.donorCount.toString()}`)
  } catch (e) {
    fail('Read pool: palestine-red-crescent', e)
  }

  // 2. Read all 6 pools
  const poolNames = ['palestine-red-crescent', 'turkish-red-crescent', 'mercy-corps', 'edhi-foundation', 'orphanage-aid', 'animal-rescue']
  for (const name of poolNames) {
    try {
      const [pda] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from(name)], PROGRAM_ID)
      const acc = await (program.account as any).pool.fetch(pda)
      assert(acc.name === name, `Pool name mismatch for ${name}`)
      ok(`Pool exists: ${name}`)
    } catch (e) {
      fail(`Pool exists: ${name}`, e)
    }
  }

  // 3. Vault PDA derivation
  try {
    const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from('palestine-red-crescent')], PROGRAM_ID)
    const [vaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('vault'), poolPDA.toBuffer()], PROGRAM_ID)
    assert(vaultPDA instanceof PublicKey, 'Vault PDA should be valid')
    const vaultInfo = await connection.getAccountInfo(vaultPDA)
    ok('Vault PDA derivation', `address=${vaultPDA.toBase58()}, balance=${vaultInfo ? vaultInfo.lamports / LAMPORTS_PER_SOL : 0} SOL`)
  } catch (e) {
    fail('Vault PDA derivation', e)
  }

  // 4. Campaign PDA derivation
  try {
    const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from('palestine-red-crescent')], PROGRAM_ID)
    const [campaignPDA] = PublicKey.findProgramAddressSync([Buffer.from('campaign'), poolPDA.toBuffer()], PROGRAM_ID)
    assert(campaignPDA instanceof PublicKey, 'Campaign PDA should be valid')
    ok('Campaign PDA derivation', `address=${campaignPDA.toBase58()}`)
  } catch (e) {
    fail('Campaign PDA derivation', e)
  }

  // 5. Milestone PDA derivation
  try {
    const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from('palestine-red-crescent')], PROGRAM_ID)
    const [campaignPDA] = PublicKey.findProgramAddressSync([Buffer.from('campaign'), poolPDA.toBuffer()], PROGRAM_ID)
    const [milestonePDA] = PublicKey.findProgramAddressSync([Buffer.from('milestone'), campaignPDA.toBuffer(), Buffer.from([0])], PROGRAM_ID)
    assert(milestonePDA instanceof PublicKey, 'Milestone PDA should be valid')
    ok('Milestone PDA derivation', `index=0, address=${milestonePDA.toBase58()}`)
  } catch (e) {
    fail('Milestone PDA derivation', e)
  }

  // 6. Donate to pool (real on-chain transaction)
  try {
    const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from('palestine-red-crescent')], PROGRAM_ID)
    const [vaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('vault'), poolPDA.toBuffer()], PROGRAM_ID)
    const donationRecord = Keypair.generate()
    const lamports = 0.001 * LAMPORTS_PER_SOL // 0.001 SOL test donation

    const poolBefore = await (program.account as any).pool.fetch(poolPDA)
    const donorsBefore = poolBefore.donorCount.toNumber()

    const tx = await (program.methods as any)
      .donateToPool(new BN(lamports))
      .accounts({
        pool: poolPDA,
        poolVault: vaultPDA,
        donationRecord: donationRecord.publicKey,
        donor: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([donationRecord])
      .rpc()

    const poolAfter = await (program.account as any).pool.fetch(poolPDA)
    assert(poolAfter.donorCount.toNumber() === donorsBefore + 1, 'Donor count should increment')
    ok('Donate to pool (on-chain)', `tx=${tx.slice(0, 16)}..., donors=${donorsBefore}→${poolAfter.donorCount.toNumber()}`)
  } catch (e) {
    fail('Donate to pool (on-chain)', e)
  }

  // 7. Create campaign on-chain
  try {
    // Use a test pool name to avoid collision with existing campaigns
    // We'll try to create a campaign for palestine-red-crescent
    const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from('palestine-red-crescent')], PROGRAM_ID)
    const [campaignPDA] = PublicKey.findProgramAddressSync([Buffer.from('campaign'), poolPDA.toBuffer()], PROGRAM_ID)

    const deadline = Math.floor(Date.now() / 1000) + 86400 * 90 // 90 days
    const descriptions = ['Phase 1', 'Phase 2', 'Phase 3']
    const percentages = [30, 30, 40]

    const tx = await (program.methods as any)
      .createCampaign(
        payer.publicKey, // recipient
        new BN(10 * LAMPORTS_PER_SOL), // target 10 SOL
        new BN(deadline),
        descriptions,
        Buffer.from(percentages),
      )
      .accounts({
        campaign: campaignPDA,
        pool: poolPDA,
        authority: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    const campaignAcc = await (program.account as any).campaign.fetch(campaignPDA)
    assert(campaignAcc.milestoneCount === 3, 'Should have 3 milestones')
    assert(campaignAcc.isActive === true, 'Should be active')
    assert(campaignAcc.targetAmount.toNumber() === 10 * LAMPORTS_PER_SOL, 'Target should be 10 SOL')
    ok('Create campaign (on-chain)', `tx=${tx.slice(0, 16)}..., milestones=3, target=10 SOL`)
  } catch (e: any) {
    if (e.message?.includes('already in use')) {
      skip('Create campaign (on-chain)', 'Campaign already exists for palestine-red-crescent')
    } else {
      fail('Create campaign (on-chain)', e)
    }
  }

  // 8. Init milestone on-chain
  try {
    const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from('palestine-red-crescent')], PROGRAM_ID)
    const [campaignPDA] = PublicKey.findProgramAddressSync([Buffer.from('campaign'), poolPDA.toBuffer()], PROGRAM_ID)
    const [milestonePDA] = PublicKey.findProgramAddressSync([Buffer.from('milestone'), campaignPDA.toBuffer(), Buffer.from([0])], PROGRAM_ID)

    const tx = await (program.methods as any)
      .initMilestone(0, 'Emergency supplies purchased', 30)
      .accounts({
        milestone: milestonePDA,
        campaign: campaignPDA,
        authority: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    const msAcc = await (program.account as any).milestone.fetch(milestonePDA)
    assert(msAcc.index === 0, 'Index should be 0')
    assert(msAcc.percentage === 30, 'Percentage should be 30')
    assert(msAcc.status === 0, 'Status should be pending (0)')
    ok('Init milestone 0 (on-chain)', `tx=${tx.slice(0, 16)}..., desc="${msAcc.description}", pct=30%`)
  } catch (e: any) {
    if (e.message?.includes('already in use')) {
      skip('Init milestone 0 (on-chain)', 'Milestone already exists')
    } else {
      fail('Init milestone 0 (on-chain)', e)
    }
  }

  // 9. Approve milestone
  try {
    const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from('palestine-red-crescent')], PROGRAM_ID)
    const [campaignPDA] = PublicKey.findProgramAddressSync([Buffer.from('campaign'), poolPDA.toBuffer()], PROGRAM_ID)
    const [milestonePDA] = PublicKey.findProgramAddressSync([Buffer.from('milestone'), campaignPDA.toBuffer(), Buffer.from([0])], PROGRAM_ID)

    // Check current status first
    const msBefore = await (program.account as any).milestone.fetch(milestonePDA)
    if (msBefore.status === 0) {
      const tx = await (program.methods as any)
        .approveMilestone()
        .accounts({
          milestone: milestonePDA,
          campaign: campaignPDA,
          authority: payer.publicKey,
        })
        .rpc()

      const msAfter = await (program.account as any).milestone.fetch(milestonePDA)
      assert(msAfter.status === 1, 'Status should be approved (1)')
      assert(msAfter.approvedAt.toNumber() > 0, 'approved_at should be set')
      ok('Approve milestone (on-chain)', `tx=${tx.slice(0, 16)}..., status=approved`)
    } else {
      skip('Approve milestone (on-chain)', `Milestone already in status ${msBefore.status}`)
    }
  } catch (e) {
    fail('Approve milestone (on-chain)', e)
  }

  // 10. Release milestone funds
  try {
    const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from('palestine-red-crescent')], PROGRAM_ID)
    const [campaignPDA] = PublicKey.findProgramAddressSync([Buffer.from('campaign'), poolPDA.toBuffer()], PROGRAM_ID)
    const [vaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('vault'), poolPDA.toBuffer()], PROGRAM_ID)
    const [milestonePDA] = PublicKey.findProgramAddressSync([Buffer.from('milestone'), campaignPDA.toBuffer(), Buffer.from([0])], PROGRAM_ID)

    const msBefore = await (program.account as any).milestone.fetch(milestonePDA)
    if (msBefore.status === 1) {
      // Need to update campaign total_raised first so release calculates correctly
      // The campaign was just created with total_raised=0, but vault has funds from donations
      // For testing, we'll check if vault has balance
      const vaultInfo = await connection.getAccountInfo(vaultPDA)
      const vaultBalance = vaultInfo ? vaultInfo.lamports : 0

      if (vaultBalance > 0) {
        const campaignAcc = await (program.account as any).campaign.fetch(campaignPDA)
        const recipientBefore = await connection.getBalance(campaignAcc.recipient)

        const tx = await (program.methods as any)
          .releaseMilestoneFunds()
          .accounts({
            milestone: milestonePDA,
            campaign: campaignPDA,
            poolVault: vaultPDA,
            recipient: campaignAcc.recipient,
            authority: payer.publicKey,
          })
          .rpc()

        const msAfter = await (program.account as any).milestone.fetch(milestonePDA)
        assert(msAfter.status === 2, 'Status should be released (2)')
        ok('Release milestone funds (on-chain)', `tx=${tx.slice(0, 16)}..., released=${msAfter.amountReleased.toNumber() / LAMPORTS_PER_SOL} SOL`)
      } else {
        skip('Release milestone funds (on-chain)', 'Vault has 0 balance, nothing to release')
      }
    } else {
      skip('Release milestone funds (on-chain)', `Milestone not in approved status (status=${msBefore.status})`)
    }
  } catch (e) {
    fail('Release milestone funds (on-chain)', e)
  }

  // 11. Claim refund (should fail - deadline not reached)
  try {
    const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('pool'), Buffer.from('palestine-red-crescent')], PROGRAM_ID)
    const [campaignPDA] = PublicKey.findProgramAddressSync([Buffer.from('campaign'), poolPDA.toBuffer()], PROGRAM_ID)
    const [vaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('vault'), poolPDA.toBuffer()], PROGRAM_ID)

    // We expect this to fail with "DeadlineNotReached"
    const donationRecord = Keypair.generate() // dummy - won't match
    try {
      await (program.methods as any)
        .claimRefund()
        .accounts({
          campaign: campaignPDA,
          donationRecord: donationRecord.publicKey,
          poolVault: vaultPDA,
          donor: payer.publicKey,
        })
        .rpc()
      fail('Claim refund guard (deadline)', 'Should have thrown DeadlineNotReached')
    } catch (refundErr: any) {
      if (refundErr.message?.includes('DeadlineNotReached') || refundErr.message?.includes('custom program error') || refundErr.message?.includes('AccountNotInitialized')) {
        ok('Claim refund guard', 'Correctly rejected (deadline not reached or account mismatch)')
      } else {
        fail('Claim refund guard', refundErr)
      }
    }
  } catch (e) {
    fail('Claim refund guard', e)
  }
}

// ===== SUPABASE TESTS =====
async function testSupabase() {
  console.log('\n\x1b[1m━━━ SUPABASE DATABASE TESTS ━━━\x1b[0m')

  // 1. Campaigns table
  try {
    const { data, error } = await supabase.from('campaigns').select('*')
    assert(!error, `Campaigns query error: ${error?.message}`)
    assert(Array.isArray(data), 'Should return array')
    assert(data!.length >= 5, `Expected at least 5 campaigns, got ${data!.length}`)
    ok('Campaigns table', `${data!.length} campaigns found`)
  } catch (e) {
    fail('Campaigns table', e)
  }

  // 2. Campaign milestones
  try {
    const { data, error } = await supabase.from('campaign_milestones').select('*')
    assert(!error, `Milestones query error: ${error?.message}`)
    assert(Array.isArray(data), 'Should return array')
    assert(data!.length >= 15, `Expected at least 15 milestones, got ${data!.length}`)
    ok('Campaign milestones table', `${data!.length} milestones found`)
  } catch (e) {
    fail('Campaign milestones table', e)
  }

  // 3. Milestone percentage validation (each campaign sums to 100)
  try {
    const { data: campaigns } = await supabase.from('campaigns').select('id, pool_id')
    for (const c of campaigns || []) {
      const { data: milestones } = await supabase.from('campaign_milestones').select('percentage').eq('campaign_id', c.id)
      const sum = (milestones || []).reduce((s, m) => s + m.percentage, 0)
      assert(sum === 100, `Campaign ${c.pool_id} milestones sum to ${sum}, expected 100`)
    }
    ok('Milestone percentages sum to 100', `All ${campaigns?.length} campaigns valid`)
  } catch (e) {
    fail('Milestone percentages sum to 100', e)
  }

  // 4. Governance proposals table has new columns
  try {
    const { data, error } = await supabase.from('governance_proposals').select('id, proposal_type, campaign_id, milestone_index').limit(1)
    assert(!error, `Governance proposals query error: ${error?.message}`)
    ok('Governance proposals schema', 'proposal_type, campaign_id, milestone_index columns exist')
  } catch (e) {
    fail('Governance proposals schema', e)
  }

  // 5. Impact NFTs table
  try {
    const { data, error } = await supabase.from('impact_nfts').select('id, cause_name, tier, amount, owner_address').limit(5)
    assert(!error, `Impact NFTs query error: ${error?.message}`)
    ok('Impact NFTs table', `${data?.length || 0} NFTs found`)
  } catch (e) {
    fail('Impact NFTs table', e)
  }

  // 6. Users table
  try {
    const { data, error } = await supabase.from('users').select('address, username, total_donated, reward_points').limit(5)
    assert(!error, `Users query error: ${error?.message}`)
    ok('Users table', `${data?.length || 0} users found`)
  } catch (e) {
    fail('Users table', e)
  }

  // 7. Pool donations table
  try {
    const { data, error } = await supabase.from('pool_donations').select('*').limit(5)
    assert(!error, `Pool donations query error: ${error?.message}`)
    ok('Pool donations table', `${data?.length || 0} donations found`)
  } catch (e) {
    fail('Pool donations table', e)
  }

  // 8. Campaign linked to correct pool
  try {
    const { data } = await supabase.from('campaigns').select('pool_id, target_amount, is_active').eq('pool_id', 'palestine-red-crescent').single()
    assert(data !== null, 'Gaza medical campaign should exist')
    assert(data!.target_amount === 10, 'Target should be 10 SOL')
    assert(data!.is_active === true, 'Should be active')
    ok('Campaign-pool link: palestine-red-crescent', `target=${data!.target_amount} SOL, active=${data!.is_active}`)
  } catch (e) {
    fail('Campaign-pool link: palestine-red-crescent', e)
  }
}

// ===== API TESTS (requires dev server) =====
async function testAPIs() {
  console.log('\n\x1b[1m━━━ API ENDPOINT TESTS ━━━\x1b[0m')

  const serverUp = await isDevServerRunning()
  if (!serverUp) {
    skip('All API tests', 'Dev server not running (run `npm run dev` first)')
    return
  }

  // 1. GET /api/pools
  try {
    const res = await fetch(`${BASE_URL}/api/pools`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    assert(Array.isArray(data.pools), 'Should return pools array')
    ok('GET /api/pools', `${data.pools.length} pools`)
  } catch (e) {
    fail('GET /api/pools', e)
  }

  // 2. GET /api/campaigns
  try {
    const res = await fetch(`${BASE_URL}/api/campaigns`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    assert(data.success === true, 'Should return success')
    assert(Array.isArray(data.campaigns), 'Should return campaigns array')
    assert(data.campaigns.length >= 5, 'Should have at least 5 campaigns')
    ok('GET /api/campaigns', `${data.campaigns.length} campaigns`)
  } catch (e) {
    fail('GET /api/campaigns', e)
  }

  // 3. GET /api/campaigns/[id]/milestones
  try {
    const campaignsRes = await fetch(`${BASE_URL}/api/campaigns`)
    const campaignsData = await campaignsRes.json()
    const campaignId = campaignsData.campaigns[0]?.id
    assert(campaignId, 'Should have at least one campaign')

    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/milestones`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    assert(Array.isArray(data.milestones), 'Should return milestones array')
    assert(data.milestones.length >= 2, 'Should have at least 2 milestones')
    ok('GET /api/campaigns/[id]/milestones', `${data.milestones.length} milestones for campaign ${campaignId.slice(0, 8)}`)
  } catch (e) {
    fail('GET /api/campaigns/[id]/milestones', e)
  }

  // 4. GET /api/nft/gallery (with address param fix)
  try {
    const res = await fetch(`${BASE_URL}/api/nft/gallery?address=${payer.publicKey.toBase58()}`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    assert(data.success === true, 'Should return success')
    assert(Array.isArray(data.nfts), 'Should return nfts array')
    ok('GET /api/nft/gallery?address=...', `${data.nfts.length} NFTs (address param works)`)
  } catch (e) {
    fail('GET /api/nft/gallery?address=...', e)
  }

  // 5. GET /api/nft/gallery (with walletAddress param - backward compat)
  try {
    const res = await fetch(`${BASE_URL}/api/nft/gallery?walletAddress=${payer.publicKey.toBase58()}`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    assert(data.success === true, 'Should return success')
    ok('GET /api/nft/gallery?walletAddress=...', 'Backward compat works')
  } catch (e) {
    fail('GET /api/nft/gallery?walletAddress=...', e)
  }

  // 6. GET /api/governance/proposals
  try {
    const res = await fetch(`${BASE_URL}/api/governance/proposals`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    ok('GET /api/governance/proposals', `${data.proposals?.length || 0} proposals`)
  } catch (e) {
    fail('GET /api/governance/proposals', e)
  }

  // 7. GET /api/impact-score
  try {
    const res = await fetch(`${BASE_URL}/api/impact-score?address=${payer.publicKey.toBase58()}&username=testuser`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    ok('GET /api/impact-score', `score=${data.score?.total || 0}, tier=${data.score?.tier || 'N/A'}`)
  } catch (e) {
    fail('GET /api/impact-score', e)
  }

  // 8. Blinks: GET /api/actions/donate/palestine-red-crescent
  try {
    const res = await fetch(`${BASE_URL}/api/actions/donate/palestine-red-crescent`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    assert(data.type === 'action', 'Type should be "action"')
    assert(data.title?.includes('Gaza'), 'Title should contain Gaza')
    assert(data.links?.actions?.length === 5, 'Should have 5 actions (4 presets + custom)')
    const cors = res.headers.get('access-control-allow-origin')
    assert(cors === '*', 'CORS should be *')
    ok('Blinks GET /api/actions/donate/palestine-red-crescent', `title="${data.title}", ${data.links.actions.length} actions, CORS=*`)
  } catch (e) {
    fail('Blinks GET /api/actions/donate/palestine-red-crescent', e)
  }

  // 9. Blinks: GET invalid pool
  try {
    const res = await fetch(`${BASE_URL}/api/actions/donate/nonexistent-pool`)
    assert(res.status === 404, 'Should return 404')
    ok('Blinks GET invalid pool', 'Returns 404')
  } catch (e) {
    fail('Blinks GET invalid pool', e)
  }

  // 10. Blinks: POST /api/actions/donate/palestine-red-crescent (transaction build)
  try {
    const res = await fetch(`${BASE_URL}/api/actions/donate/palestine-red-crescent?amount=0.01`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: payer.publicKey.toBase58() }),
    })
    const data = await res.json()
    assert(res.ok, `Should return 200, got ${res.status}: ${JSON.stringify(data)}`)
    assert(typeof data.transaction === 'string', 'Should return base64 transaction')
    assert(data.transaction.length > 100, 'Transaction should be substantial')
    assert(data.message?.includes('Donating'), 'Should have message')
    ok('Blinks POST transaction build', `tx_size=${data.transaction.length} chars, msg="${data.message}"`)
  } catch (e) {
    fail('Blinks POST transaction build', e)
  }

  // 11. Blinks: OPTIONS preflight
  try {
    const res = await fetch(`${BASE_URL}/api/actions/donate/palestine-red-crescent`, { method: 'OPTIONS' })
    const cors = res.headers.get('access-control-allow-origin')
    assert(cors === '*', 'CORS should be *')
    ok('Blinks OPTIONS preflight', 'CORS headers present')
  } catch (e) {
    fail('Blinks OPTIONS preflight', e)
  }

  // 12. Actions manifest
  try {
    const res = await fetch(`${BASE_URL}/.well-known/actions.json`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    assert(Array.isArray(data.rules), 'Should have rules array')
    assert(data.rules[0]?.pathPattern?.includes('/api/actions/donate/'), 'Should have donate path pattern')
    ok('GET /.well-known/actions.json', `${data.rules.length} rules`)
  } catch (e) {
    fail('GET /.well-known/actions.json', e)
  }

  // 13. Smart feed with address param
  try {
    const res = await fetch(`${BASE_URL}/api/feed/smart?username=testuser&address=${payer.publicKey.toBase58()}`)
    const data = await res.json()
    assert(res.ok || data.feed !== undefined, 'Should return feed')
    ok('GET /api/feed/smart (with address)', `${data.feed?.length || 0} feed items`)
  } catch (e) {
    fail('GET /api/feed/smart (with address)', e)
  }

  // 14. Platform stats
  try {
    const res = await fetch(`${BASE_URL}/api/platform/stats`)
    const data = await res.json()
    assert(res.ok, 'Should return 200')
    ok('GET /api/platform/stats', `users=${data.stats?.totalUsers || 0}, donated=${data.stats?.totalDonated || 0}`)
  } catch (e) {
    fail('GET /api/platform/stats', e)
  }
}

// ===== BLINKS DEEP TESTS =====
async function testBlinksDeep() {
  console.log('\n\x1b[1m━━━ BLINKS DEEP TESTS ━━━\x1b[0m')

  const serverUp = await isDevServerRunning()
  if (!serverUp) {
    skip('All Blinks deep tests', 'Dev server not running')
    return
  }

  // Test all 5 pool Blinks
  const pools = ['palestine-red-crescent', 'turkish-red-crescent', 'mercy-corps', 'edhi-foundation', 'orphanage-aid', 'animal-rescue']
  for (const poolId of pools) {
    try {
      const res = await fetch(`${BASE_URL}/api/actions/donate/${poolId}`)
      const data = await res.json()
      assert(res.ok, `Should return 200 for ${poolId}`)
      assert(data.type === 'action', 'Should be action type')
      ok(`Blink metadata: ${poolId}`, `title="${data.title}"`)
    } catch (e) {
      fail(`Blink metadata: ${poolId}`, e)
    }
  }

  // Test various donation amounts
  const amounts = ['0.01', '0.05', '0.1', '0.5']
  for (const amount of amounts) {
    try {
      const res = await fetch(`${BASE_URL}/api/actions/donate/palestine-red-crescent?amount=${amount}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: payer.publicKey.toBase58() }),
      })
      const data = await res.json()
      assert(res.ok, `POST should succeed for amount=${amount}`)
      assert(typeof data.transaction === 'string', 'Should return transaction')
      ok(`Blink tx build: ${amount} SOL`, `tx_len=${data.transaction.length}`)
    } catch (e) {
      fail(`Blink tx build: ${amount} SOL`, e)
    }
  }
}

// ===== IDL VALIDATION =====
async function testIDL() {
  console.log('\n\x1b[1m━━━ IDL VALIDATION ━━━\x1b[0m')

  try {
    const idlData = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))

    // Check instructions exist
    const instructionNames = (idlData.instructions || []).map((i: any) => i.name)
    const expected = ['initialize_pool', 'one_tap_donate', 'donate_to_pool', 'withdraw_from_pool', 'create_campaign', 'init_milestone', 'approve_milestone', 'release_milestone_funds', 'claim_refund']
    for (const name of expected) {
      assert(instructionNames.includes(name), `Missing instruction: ${name}`)
    }
    ok('IDL instructions', `${instructionNames.length} instructions: ${instructionNames.join(', ')}`)

    // Check accounts exist
    const accountNames = (idlData.accounts || []).map((a: any) => a.name)
    const expectedAccounts = ['Pool', 'DonationRecord', 'Campaign', 'Milestone']
    for (const name of expectedAccounts) {
      assert(accountNames.includes(name), `Missing account: ${name}`)
    }
    ok('IDL accounts', `${accountNames.length} accounts: ${accountNames.join(', ')}`)

    // Check events exist
    const eventNames = (idlData.events || []).map((e: any) => e.name)
    const expectedEvents = ['DonationMade', 'PoolWithdrawal', 'CampaignCreated', 'MilestoneApproved', 'MilestoneReleased', 'RefundClaimed']
    for (const name of expectedEvents) {
      assert(eventNames.includes(name), `Missing event: ${name}`)
    }
    ok('IDL events', `${eventNames.length} events: ${eventNames.join(', ')}`)

    // Check errors exist
    const errorNames = (idlData.errors || []).map((e: any) => e.name)
    assert(errorNames.length >= 8, `Expected at least 8 errors, got ${errorNames.length}`)
    ok('IDL errors', `${errorNames.length} error codes`)

    // Verify IDL program ID matches
    assert(idlData.address === PROGRAM_ID.toBase58(), 'IDL program ID should match')
    ok('IDL program ID', idlData.address)

  } catch (e) {
    fail('IDL validation', e)
  }
}

// ===== RUN ALL =====
async function main() {
  console.log('\x1b[1m\x1b[36m')
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║     Umanity — Deep E2E Test Suite            ║')
  console.log('║     Escrow · Blinks · DAO · NFTs             ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log('\x1b[0m')
  console.log(`Wallet: ${payer.publicKey.toBase58()}`)
  console.log(`RPC: ${RPC_URL}`)
  console.log(`Program: ${PROGRAM_ID.toBase58()}`)

  const balance = await connection.getBalance(payer.publicKey)
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`)

  await testIDL()
  await testOnChain()
  await testSupabase()
  await testAPIs()
  await testBlinksDeep()

  console.log('\n\x1b[1m━━━ RESULTS ━━━\x1b[0m')
  console.log(`  \x1b[32m✓ Passed: ${passed}\x1b[0m`)
  if (failed > 0) console.log(`  \x1b[31m✗ Failed: ${failed}\x1b[0m`)
  if (skipped > 0) console.log(`  \x1b[33m○ Skipped: ${skipped}\x1b[0m`)
  console.log(`  Total: ${passed + failed + skipped}`)
  console.log()

  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('\n\x1b[31mFatal error:\x1b[0m', err)
  process.exit(1)
})
