import { NextRequest, NextResponse } from 'next/server'
import { getNetworkActivityFeed } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    }
    const page = parseInt(request.nextUrl.searchParams.get('page') || '0')
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20')
    const data = await getNetworkActivityFeed(username, page, pageSize)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json({ activities: [] })
  }
}
