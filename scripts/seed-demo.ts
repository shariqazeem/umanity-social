/**
 * Seed realistic demo data — makes REAL on-chain donations to each pool.
 * Creates actual DonationRecords, updates pool stats, and syncs to Supabase.
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */

import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROGRAM_ID = new PublicKey('9JBsHFy9rQhjcPiKkFzqxpUV9HZyZ1ZmE4AWXc1Kiys1')
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com'

// Realistic donation amounts for each pool (multiple donations per pool)
const SEED_DONATIONS = [
  // Palestine Red Crescent — most popular cause
  { pool: 'palestine-red-crescent', amounts: [0.05, 0.1, 0.02, 0.03, 0.01, 0.05, 0.01] },
  // Turkish Red Crescent
  { pool: 'turkish-red-crescent', amounts: [0.03, 0.05, 0.01, 0.02, 0.01] },
  // Mercy Corps
  { pool: 'mercy-corps', amounts: [0.02, 0.05, 0.01, 0.03] },
  // Edhi Foundation
  { pool: 'edhi-foundation', amounts: [0.03, 0.02, 0.01, 0.05, 0.01] },
  // Orphanage Aid — physical cause
  { pool: 'orphanage-aid', amounts: [0.05, 0.01, 0.02, 0.01] },
  // Animal Rescue — physical cause
  { pool: 'animal-rescue', amounts: [0.02, 0.01, 0.03, 0.01] },
]

async function main() {
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

  const balance = await connection.getBalance(payer.publicKey)
  console.log(`Wallet: ${payer.publicKey.toBase58()}`)
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`)

  const totalNeeded = SEED_DONATIONS.reduce((sum, p) => sum + p.amounts.reduce((s, a) => s + a, 0), 0)
  console.log(`Total donations to seed: ${totalNeeded.toFixed(3)} SOL across ${SEED_DONATIONS.reduce((s, p) => s + p.amounts.length, 0)} transactions\n`)

  if (balance / LAMPORTS_PER_SOL < totalNeeded + 0.5) {
    console.error(`Insufficient balance. Need at least ${(totalNeeded + 0.5).toFixed(3)} SOL (donations + fees)`)
    process.exit(1)
  }

  let totalDonated = 0
  let txCount = 0

  for (const poolConfig of SEED_DONATIONS) {
    const poolName = poolConfig.pool
    const [poolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), Buffer.from(poolName)],
      PROGRAM_ID
    )
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolPDA.toBuffer()],
      PROGRAM_ID
    )

    console.log(`--- ${poolName} (${poolConfig.amounts.length} donations) ---`)

    for (const amount of poolConfig.amounts) {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL)
      const donationRecord = Keypair.generate()

      try {
        const sig = await (program.methods as any)
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

        totalDonated += amount
        txCount++
        console.log(`  ${amount} SOL  tx: ${sig.slice(0, 20)}...`)

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500))
      } catch (e: any) {
        console.error(`  FAILED ${amount} SOL: ${e.message?.slice(0, 80)}`)
      }
    }
    console.log()
  }

  // Print final pool stats
  console.log(`\n=== RESULTS ===`)
  console.log(`${txCount} donations totaling ${totalDonated.toFixed(3)} SOL\n`)

  for (const poolConfig of SEED_DONATIONS) {
    const [poolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), Buffer.from(poolConfig.pool)],
      PROGRAM_ID
    )
    try {
      const acc = await (program.account as any).pool.fetch(poolPDA)
      const donated = Number(acc.totalDonated) / LAMPORTS_PER_SOL
      console.log(`  ${poolConfig.pool}: ${donated.toFixed(3)} SOL, ${acc.donorCount.toString()} donors`)
    } catch {
      console.log(`  ${poolConfig.pool}: could not read`)
    }
  }

  const endBalance = await connection.getBalance(payer.publicKey)
  console.log(`\nWallet balance: ${(endBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL (spent ${((balance - endBalance) / LAMPORTS_PER_SOL).toFixed(4)} SOL including fees)`)
}

main().catch(console.error)
