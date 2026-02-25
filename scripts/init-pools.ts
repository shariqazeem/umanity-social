import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Keypair, Connection } from '@solana/web3.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROGRAM_ID = new PublicKey('9JBsHFy9rQhjcPiKkFzqxpUV9HZyZ1ZmE4AWXc1Kiys1')

const POOLS = [
  {
    name: 'palestine-red-crescent',
    description: 'Medical aid & emergency relief for civilians in Palestine via PRCS',
    emoji: '\u{1F3E5}',
    poolType: 0, // Medical
  },
  {
    name: 'turkish-red-crescent',
    description: 'Earthquake recovery & disaster relief via Turkish Red Crescent (Kizilay)',
    emoji: '\u{1F198}',
    poolType: 2, // Emergency
  },
  {
    name: 'mercy-corps',
    description: 'Clean water, food security & crisis response worldwide via Mercy Corps',
    emoji: '\u{1F30D}',
    poolType: 3, // Infrastructure
  },
  {
    name: 'edhi-foundation',
    description: 'Healthcare, orphan care & emergency services via Edhi Foundation Pakistan',
    emoji: '\u{1F91D}',
    poolType: 0, // Medical
  },
  {
    name: 'orphanage-aid',
    description: 'Supplies, education & care for local orphanages — Umanity delivers personally',
    emoji: '\u{1F476}',
    poolType: 1, // Education
  },
  {
    name: 'animal-rescue',
    description: 'Rescue, shelter & medical care for street animals — Umanity delivers personally',
    emoji: '\u{1F43E}',
    poolType: 3, // Infrastructure
  },
]

async function main() {
  // Load wallet
  const walletPath = path.resolve(process.env.HOME || '~', '.config/solana/devnet.json')
  const raw = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
  const payer = Keypair.fromSecretKey(Uint8Array.from(raw))

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
  const wallet = new anchor.Wallet(payer)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })

  // Load IDL
  const idlPath = path.resolve(__dirname, '../target/idl/umanity_donations.json')
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))
  const program = new anchor.Program(idl, provider)

  console.log('Initializing 6 charity pools on devnet...')
  console.log('Authority:', payer.publicKey.toBase58())

  for (const pool of POOLS) {
    try {
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), Buffer.from(pool.name)],
        PROGRAM_ID
      )
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), poolPDA.toBuffer()],
        PROGRAM_ID
      )

      console.log(`\nInitializing pool: ${pool.name}`)
      console.log(`  Pool PDA: ${poolPDA.toBase58()}`)
      console.log(`  Vault PDA: ${vaultPDA.toBase58()}`)

      const tx = await (program.methods as any)
        .initializePool(pool.name, pool.description, pool.emoji, pool.poolType)
        .accounts({
          pool: poolPDA,
          poolVault: vaultPDA,
          authority: payer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc()

      console.log(`  TX: ${tx}`)
      console.log(`  Success!`)
    } catch (e: any) {
      if (e.message?.includes('already in use')) {
        console.log(`  Pool "${pool.name}" already exists, skipping.`)
      } else {
        console.error(`  Error initializing ${pool.name}:`, e.message)
      }
    }
  }

  console.log('\nDone! All pools initialized.')
}

main().catch(console.error)
