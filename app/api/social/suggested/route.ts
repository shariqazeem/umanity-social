import { NextRequest, NextResponse } from 'next/server'
import { getSuggestedProfiles } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ profiles: [] })
    }
    const profiles = await getSuggestedProfiles(username)
    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Suggested profiles error:', error)
    return NextResponse.json({ profiles: [] })
  }
}
