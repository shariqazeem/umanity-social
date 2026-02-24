import { NextRequest, NextResponse } from 'next/server'
import { getReferralChain } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    const depth = parseInt(request.nextUrl.searchParams.get('depth') || '2')
    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    }
    const chain = await getReferralChain(username, depth)
    return NextResponse.json(chain)
  } catch (error) {
    console.error('Referrals error:', error)
    return NextResponse.json({ referrals: [] })
  }
}
