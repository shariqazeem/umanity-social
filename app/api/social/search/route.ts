import { NextRequest, NextResponse } from 'next/server'
import { searchProfiles } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q')
    if (!query || query.length < 2) {
      return NextResponse.json({ profiles: [] })
    }
    const rawProfiles = await searchProfiles(query)

    // Normalize Tapestry profile data
    const profiles = (rawProfiles || [])
      .map((p: any, i: number) => ({
        username: p.username || p.id || p.profile?.username || p.walletAddress || '',
        bio: p.bio || p.profile?.bio || '',
        walletAddress: p.walletAddress || p.wallet || p.profile?.walletAddress || '',
      }))
      .filter((p: any) => p.username) // Drop entries with no username

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ profiles: [] })
  }
}
