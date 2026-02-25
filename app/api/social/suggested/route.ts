import { NextRequest, NextResponse } from 'next/server'
import { getSuggestedProfiles } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ profiles: [] })
    }
    const rawProfiles = await getSuggestedProfiles(username)

    // Normalize Tapestry profile data
    const profiles = (rawProfiles || [])
      .map((p: any) => ({
        username: p.username || p.id || p.profile?.username || '',
        bio: p.bio || p.profile?.bio || '',
      }))
      .filter((p: any) => p.username)

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Suggested profiles error:', error)
    return NextResponse.json({ profiles: [] })
  }
}
