import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { supabase } from '@/lib/supabase'

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept-Encoding',
  'Access-Control-Expose-Headers': 'X-Action-Version, X-Blockchain-Ids',
  'X-Action-Version': '2.1.3',
  'X-Blockchain-Ids': 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
}

// GET: Return Solana Action metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  // Verify the user exists
  const { data: user, error } = await supabase
    .from('users')
    .select('address, username, display_name')
    .eq('username', username.toLowerCase())
    .single()

  if (error || !user) {
    return NextResponse.json(
      { error: `User @${username} not found on Umanity` },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const payload = {
    type: 'action',
    title: `Tip @${user.username} on Umanity`,
    icon: 'https://umanity-solana.vercel.app/icon.png',
    description: 'Send a SOL tip to a community member',
    label: 'Tip SOL',
    links: {
      actions: [
        { label: '0.01 SOL', href: `/api/actions/tip/${user.username}?amount=0.01` },
        { label: '0.05 SOL', href: `/api/actions/tip/${user.username}?amount=0.05` },
        { label: '0.1 SOL', href: `/api/actions/tip/${user.username}?amount=0.1` },
        { label: '0.5 SOL', href: `/api/actions/tip/${user.username}?amount=0.5` },
        {
          label: 'Custom Amount',
          href: `/api/actions/tip/${user.username}?amount={amount}`,
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

// POST: Build SOL transfer transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    // Look up recipient's wallet address by username
    const { data: recipient, error } = await supabase
      .from('users')
      .select('address, username')
      .eq('username', username.toLowerCase())
      .single()

    if (error || !recipient) {
      return NextResponse.json(
        { error: `User @${username} not found on Umanity` },
        { status: 404, headers: CORS_HEADERS }
      )
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
    const recipientPubkey = new PublicKey(recipient.address)

    const connection = new Connection(SOLANA_RPC, 'confirmed')
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: userPubkey,
    })

    // Simple SOL transfer from sender to recipient
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: recipientPubkey,
        lamports,
      })
    )

    // Serialize for user to sign
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })

    const payload = {
      transaction: serialized.toString('base64'),
      message: `Tipping ${amount} SOL to @${recipient.username} via Umanity`,
    }

    return NextResponse.json(payload, { headers: CORS_HEADERS })
  } catch (error: any) {
    console.error('Tip Blink POST error:', error)
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
