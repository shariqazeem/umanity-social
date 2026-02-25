import { NextRequest, NextResponse } from 'next/server'
import { POOL_META } from '@/lib/constants'
import { getPoolById } from '@/lib/storage'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept-Encoding',
  'Access-Control-Expose-Headers': 'X-Action-Version, X-Blockchain-Ids',
  'X-Action-Version': '2.1.3',
  'X-Blockchain-Ids': 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
}

// GET: Return Solana Action metadata with pool stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { poolId } = await params
  const meta = POOL_META[poolId]

  if (!meta) {
    return NextResponse.json({ error: 'Pool not found' }, { status: 404, headers: CORS_HEADERS })
  }

  // Fetch on-chain / Supabase pool stats
  const pool = await getPoolById(poolId)
  const totalDonated = pool?.totalDonated ?? 0
  const donorCount = pool?.donorCount ?? 0

  const poolTitle = poolId.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

  const payload = {
    type: 'action',
    title: `${meta.emoji} ${poolTitle} on Umanity`,
    icon: 'https://umanity-solana.vercel.app/icon.png',
    description: `${meta.description}\n\nTotal donated: ${totalDonated.toFixed(2)} SOL | ${donorCount} donor${donorCount !== 1 ? 's' : ''}`,
    label: 'Donate Now',
    links: {
      actions: [
        {
          label: 'Donate Now',
          href: `/api/actions/donate/${poolId}?amount=0.01`,
        },
      ],
    },
  }

  return NextResponse.json(payload, { headers: CORS_HEADERS })
}

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS })
}
