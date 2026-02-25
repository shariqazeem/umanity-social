import { NextRequest, NextResponse } from 'next/server'
import { createFollow, removeFollow, checkFollow, getFollowers, getFollowing } from '@/lib/tapestry'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Accept both naming conventions
    const followerId = body.followerId || body.follower
    const followeeId = body.followeeId || body.followee

    if (!followerId || !followeeId) {
      return NextResponse.json({ error: 'followerId/follower and followeeId/followee required' }, { status: 400 })
    }

    await createFollow(followerId, followeeId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Follow error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const followerId = body.followerId || body.follower
    const followeeId = body.followeeId || body.followee

    if (!followerId || !followeeId) {
      return NextResponse.json({ error: 'followerId/follower and followeeId/followee required' }, { status: 400 })
    }

    await removeFollow(followerId, followeeId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unfollow error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const username = searchParams.get('username')
    const follower = searchParams.get('follower')
    const followee = searchParams.get('followee')

    // Check follow status
    if (follower && followee) {
      const isFollowing = await checkFollow(follower, followee)
      return NextResponse.json({ success: true, isFollowing })
    }

    // Get followers list - getFollowers already returns parsed profiles array
    if (username && type === 'followers') {
      const profiles = await getFollowers(username)
      return NextResponse.json({ success: true, followers: profiles || [] })
    }

    // Get following list - getFollowing already returns parsed profiles array
    if (username && type === 'following') {
      const profiles = await getFollowing(username)
      return NextResponse.json({ success: true, following: profiles || [] })
    }

    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  } catch {
    return NextResponse.json({ success: false, isFollowing: false, followers: [], following: [] })
  }
}
