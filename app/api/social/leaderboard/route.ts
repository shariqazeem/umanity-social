import { NextRequest, NextResponse } from 'next/server'
import { getTapestryLeaderboard } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const namespace = request.nextUrl.searchParams.get('namespace') || 'risen'
    const data = await getTapestryLeaderboard(namespace)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ entries: [] })
  }
}
