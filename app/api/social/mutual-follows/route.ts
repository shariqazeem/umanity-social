import { NextRequest, NextResponse } from 'next/server'
import { getFollowingWhoFollow } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const myUsername = request.nextUrl.searchParams.get('me')
    const targetUsername = request.nextUrl.searchParams.get('target')
    if (!myUsername || !targetUsername) {
      return NextResponse.json({ error: 'Missing me or target' }, { status: 400 })
    }
    const mutuals = await getFollowingWhoFollow(myUsername, targetUsername)
    return NextResponse.json({ mutuals })
  } catch (error) {
    console.error('Mutual follows error:', error)
    return NextResponse.json({ mutuals: [] })
  }
}
