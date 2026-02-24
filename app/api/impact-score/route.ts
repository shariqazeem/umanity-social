import { NextRequest, NextResponse } from 'next/server'
import { calculateImpactScore } from '@/lib/impact-score'

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address')
    const username = request.nextUrl.searchParams.get('username')
    if (!address || !username) {
      return NextResponse.json({ error: 'Missing address or username' }, { status: 400 })
    }
    const score = await calculateImpactScore(address, username)
    return NextResponse.json(score)
  } catch (error) {
    console.error('Impact score error:', error)
    return NextResponse.json({
      donations: 0, consistency: 0, governance: 0, social: 0,
      tipping: 0, referrals: 0, loyalty: 0, total: 0, tier: 'Seedling'
    })
  }
}
