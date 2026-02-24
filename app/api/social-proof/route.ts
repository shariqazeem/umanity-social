import { NextRequest, NextResponse } from 'next/server'
import { getSocialProofForPool } from '@/lib/social-proof'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    const poolId = request.nextUrl.searchParams.get('poolId')
    if (!username || !poolId) {
      return NextResponse.json({ error: 'Missing username or poolId' }, { status: 400 })
    }
    const result = await getSocialProofForPool(username, poolId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Social proof error:', error)
    return NextResponse.json({ matchedUsernames: [], totalMatched: 0, totalDonors: 0 })
  }
}
