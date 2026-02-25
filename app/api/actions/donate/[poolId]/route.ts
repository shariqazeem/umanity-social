import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { POOL_META, POOL_SEEDS, UMANITY_DONATIONS_PROGRAM_ID } from '@/lib/constants'

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept-Encoding',
  'Access-Control-Expose-Headers': 'X-Action-Version, X-Blockchain-Ids',
  'X-Action-Version': '2.1.3',
  'X-Blockchain-Ids': 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
}

function findPoolPDA(poolName: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), Buffer.from(poolName)],
    new PublicKey(UMANITY_DONATIONS_PROGRAM_ID)
  )
  return pda
}

function findVaultPDA(poolPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), poolPubkey.toBuffer()],
    new PublicKey(UMANITY_DONATIONS_PROGRAM_ID)
  )
  return pda
}

// GET: Return Solana Action metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { poolId } = await params
  const meta = POOL_META[poolId]

  if (!meta) {
    return NextResponse.json({ error: 'Pool not found' }, { status: 404, headers: CORS_HEADERS })
  }

  const payload = {
    type: 'action',
    title: `Donate to ${meta.emoji} ${poolId.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}`,
    icon: 'https://umanity-solana.vercel.app/icon.png',
    description: meta.description,
    label: 'Donate SOL',
    links: {
      actions: [
        { label: '0.01 SOL', href: `/api/actions/donate/${poolId}?amount=0.01` },
        { label: '0.05 SOL', href: `/api/actions/donate/${poolId}?amount=0.05` },
        { label: '0.1 SOL', href: `/api/actions/donate/${poolId}?amount=0.1` },
        { label: '0.5 SOL', href: `/api/actions/donate/${poolId}?amount=0.5` },
        {
          label: 'Custom Amount',
          href: `/api/actions/donate/${poolId}?amount={amount}`,
          parameters: [
            {
              name: 'amount',
              label: 'SOL amount',
              required: true,
            },
          ],
        },
      ],
    },
  }

  return NextResponse.json(payload, { headers: CORS_HEADERS })
}

// POST: Build partially-signed transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const { poolId } = await params
    const poolSeed = POOL_SEEDS[poolId]
    if (!poolSeed) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404, headers: CORS_HEADERS })
    }

    const body = await request.json()
    const userPubkey = new PublicKey(body.account)

    // Get amount from query string
    const url = new URL(request.url)
    const amountStr = url.searchParams.get('amount')
    const amount = parseFloat(amountStr || '0.01')
    if (amount <= 0 || amount > 100) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400, headers: CORS_HEADERS })
    }

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL)

    // Derive PDAs
    const poolPDA = findPoolPDA(poolSeed)
    const vaultPDA = findVaultPDA(poolPDA)

    // Generate DonationRecord keypair (server-side, we sign for it)
    const donationRecord = Keypair.generate()

    // Build the Anchor instruction manually
    // Anchor discriminator for donate_to_pool = first 8 bytes of sha256("global:donate_to_pool")
    const { createHash } = await import('crypto')
    const discriminator = createHash('sha256')
      .update('global:donate_to_pool')
      .digest()
      .subarray(0, 8)

    // Encode amount as u64 LE
    const amountBuffer = Buffer.alloc(8)
    amountBuffer.writeBigUInt64LE(BigInt(lamports))

    const data = Buffer.concat([discriminator, amountBuffer])

    const programId = new PublicKey(UMANITY_DONATIONS_PROGRAM_ID)

    const connection = new Connection(SOLANA_RPC, 'confirmed')
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

    // Calculate rent for DonationRecord (discriminator 8 + Pubkey 32 + Pubkey 32 + u64 8 + i64 8 + u8 1 = 89 bytes)
    const donationRecordSpace = 8 + 32 + 32 + 8 + 8 + 1
    const rentLamports = await connection.getMinimumBalanceForRentExemption(donationRecordSpace)

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: userPubkey,
    })

    // Create DonationRecord account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: userPubkey,
        newAccountPubkey: donationRecord.publicKey,
        lamports: rentLamports,
        space: donationRecordSpace,
        programId,
      })
    )

    // Add donate_to_pool instruction
    transaction.add({
      keys: [
        { pubkey: poolPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: donationRecord.publicKey, isSigner: true, isWritable: true },
        { pubkey: userPubkey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data,
    })

    // Partially sign with donation record keypair
    transaction.partialSign(donationRecord)

    // Serialize for user to sign
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })

    const payload = {
      transaction: serialized.toString('base64'),
      message: `Donating ${amount} SOL to ${poolId.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} via Umanity`,
    }

    return NextResponse.json(payload, { headers: CORS_HEADERS })
  } catch (error: any) {
    console.error('Blink POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to build transaction' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS })
}
