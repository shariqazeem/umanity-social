/**
 * Sync on-chain pool data to Supabase.
 * Reads actual pool stats from devnet and upserts into Supabase pools table.
 * Also creates pool_donations records for tracking.
 *
 * Usage: node --env-file=.env.local -e "require('child_process').execSync('npx tsx scripts/sync-pools-to-supabase.ts', {stdio:'inherit', env:process.env})"
 */

import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROGRAM_ID = new PublicKey('9JBsHFy9rQhjcPiKkFzqxpUV9HZyZ1ZmE4AWXc1Kiys1')
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const POOL_INFO: Record<string, { name: string; description: string }> = {
  'palestine-red-crescent': { name: 'Palestine Red Crescent Society', description: 'Medical aid & emergency relief for civilians in Palestine via PRCS' },
  'turkish-red-crescent': { name: 'Turkish Red Crescent (Kizilay)', description: 'Earthquake recovery & disaster relief via Turkish Red Crescent' },
  'mercy-corps': { name: 'Mercy Corps', description: 'Clean water, food security & crisis response worldwide via Mercy Corps' },
  'edhi-foundation': { name: 'Edhi Foundation', description: 'Healthcare, orphan care & emergency services via Edhi Foundation Pakistan' },
  'orphanage-aid': { name: 'Local Orphanage Aid', description: 'Supplies, education & care for local orphanages — Umanity delivers personally' },
  'animal-rescue': { name: 'Street Animal Rescue', description: 'Rescue, shelter & medical care for street animals — Umanity delivers personally' },
}

async function main() {
  const walletPath = path.resolve(process.env.HOME || '~', '.config/solana/devnet.json')
  const raw = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
  const payer = Keypair.fromSecretKey(Uint8Array.from(raw))

  const connection = new Connection(RPC_URL, 'confirmed')
  const wallet = new anchor.Wallet(payer)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })

  const idlPath = path.resolve(__dirname, '../target/idl/umanity_donations.json')
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))
  const program = new anchor.Program(idl, provider)

  console.log('Syncing on-chain pool data to Supabase...\n')

  for (const [poolId, info] of Object.entries(POOL_INFO)) {
    const [poolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), Buffer.from(poolId)],
      PROGRAM_ID
    )

    try {
      const acc = await (program.account as any).pool.fetch(poolPDA)
      const totalDonated = Number(acc.totalDonated) / LAMPORTS_PER_SOL
      const donorCount = Number(acc.donorCount)

      // Upsert pool in Supabase
      const { error } = await supabase
        .from('pools')
        .upsert({
          id: poolId,
          name: info.name,
          description: info.description,
          total_donated: totalDonated,
        }, { onConflict: 'id' })

      if (error) {
        console.error(`  [error] ${poolId}: ${error.message}`)
      } else {
        console.log(`  [ok] ${poolId}: ${totalDonated.toFixed(3)} SOL, ${donorCount} on-chain donors`)
      }

      // Also create a pool_donations record so donor count works
      // (single record representing all seed donations from deployer wallet)
      const { error: donError } = await supabase
        .from('pool_donations')
        .upsert({
          id: `seed-${poolId}`,
          donor: payer.publicKey.toBase58(),
          pool_id: poolId,
          pool_name: info.name,
          amount: totalDonated,
          signature: `seed-${poolId}`,
          reward_points_earned: Math.floor(totalDonated * 1000),
        }, { onConflict: 'id' })

      if (donError) {
        console.error(`    [warn] donation record: ${donError.message}`)
      }
    } catch (e: any) {
      console.error(`  [error] ${poolId}: ${e.message?.slice(0, 60)}`)
    }
  }

  // Also update campaign total_raised from on-chain data
  console.log('\nSyncing campaign totals...')
  for (const poolId of Object.keys(POOL_INFO)) {
    const [poolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), Buffer.from(poolId)],
      PROGRAM_ID
    )
    try {
      const acc = await (program.account as any).pool.fetch(poolPDA)
      const totalDonated = Number(acc.totalDonated) / LAMPORTS_PER_SOL

      const { error } = await supabase
        .from('campaigns')
        .update({ total_raised: totalDonated })
        .eq('pool_id', poolId)

      if (error) {
        console.error(`  [error] campaign ${poolId}: ${error.message}`)
      } else {
        console.log(`  [ok] campaign ${poolId}: total_raised = ${totalDonated.toFixed(3)} SOL`)
      }
    } catch {
      // No campaign for this pool
    }
  }

  console.log('\nDone! Supabase is now in sync with on-chain data.')
}

main().catch(console.error)
