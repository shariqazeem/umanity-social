import { NextRequest, NextResponse } from 'next/server'
import { searchProfiles } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q')
    if (!query || query.length < 2) {
      return NextResponse.json({ profiles: [] })
    }
    const profiles = await searchProfiles(query)
    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ profiles: [] })
  }
}
