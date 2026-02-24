import { NextRequest, NextResponse } from 'next/server'
import { getNetworkActivityFeed, getFilteredContent, getSuggestedProfiles, getFollowing } from '@/lib/tapestry'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    }

    type FeedItem = {
      type: 'post' | 'donation_event' | 'proposal' | 'trending' | 'suggested_follow'
      id: string
      data: Record<string, unknown>
      timestamp?: string
    }

    const feedItems: FeedItem[] = []

    // 1. Network activity (primary feed source)
    try {
      const activityData = await getNetworkActivityFeed(username, 0, 20)
      const activities = activityData?.activities || activityData?.contents || []
      for (const item of activities) {
        feedItems.push({
          type: 'post',
          id: item.id || `activity_${Date.now()}_${Math.random()}`,
          data: item,
          timestamp: item.createdAt || item.created_at,
        })
      }
    } catch {
      // Network feed may be empty for new users
    }

    // 2. Recent donations from people user follows
    try {
      const following = await getFollowing(username)
      const followingUsernames = (following || []).map((p: { username?: string }) => p.username).filter(Boolean)
      if (followingUsernames.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('address, username')
          .in('username', followingUsernames)

        if (users && users.length > 0) {
          const addresses = users.map(u => u.address)
          const { data: donations } = await supabase
            .from('pool_donations')
            .select('*')
            .in('donor', addresses)
            .order('timestamp', { ascending: false })
            .limit(5)

          const addressToUsername = Object.fromEntries(users.map(u => [u.address, u.username]))
          for (const d of donations || []) {
            feedItems.push({
              type: 'donation_event',
              id: `donation_${d.id}`,
              data: {
                ...d,
                username: addressToUsername[d.donor] || d.donor.slice(0, 8),
              },
              timestamp: d.timestamp,
            })
          }
        }
      }
    } catch {
      // Donation feed may fail
    }

    // 3. One active governance proposal
    try {
      const { data: proposals } = await supabase
        .from('governance_proposals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (proposals && proposals.length > 0) {
        feedItems.push({
          type: 'proposal',
          id: `proposal_${proposals[0].id}`,
          data: proposals[0],
          timestamp: proposals[0].created_at,
        })
      }
    } catch {
      // No proposals
    }

    // 4. Trending posts (high engagement)
    try {
      const trending = await getFilteredContent({
        orderByField: 'likeCount',
        orderDirection: 'desc',
        pageSize: 3,
      })
      for (const item of trending) {
        feedItems.push({
          type: 'trending',
          id: `trending_${item.id}`,
          data: item,
          timestamp: item.createdAt || item.created_at,
        })
      }
    } catch {
      // Trending may fail
    }

    // 5. Suggested follow
    try {
      const suggested = await getSuggestedProfiles(username)
      if (suggested.length > 0) {
        feedItems.push({
          type: 'suggested_follow',
          id: `suggest_${suggested[0].username || suggested[0].id}`,
          data: suggested[0],
        })
      }
    } catch {
      // No suggestions
    }

    // Fallback: if feed is mostly empty, fetch global posts
    if (feedItems.filter(i => i.type === 'post').length === 0) {
      try {
        const globalPosts = await getFilteredContent({
          orderDirection: 'desc',
          pageSize: 10,
        })
        for (const item of globalPosts) {
          feedItems.push({
            type: 'post',
            id: item.id || `global_${Date.now()}_${Math.random()}`,
            data: item,
            timestamp: item.createdAt || item.created_at,
          })
        }
      } catch {
        // No global posts
      }

      // Add more suggestions for new users
      try {
        const moreSuggested = await getSuggestedProfiles(username)
        for (const s of moreSuggested.slice(0, 3)) {
          feedItems.push({
            type: 'suggested_follow',
            id: `suggest_${s.username || s.id}`,
            data: s,
          })
        }
      } catch {
        // No suggestions
      }
    }

    // Deduplicate by id
    const seen = new Set<string>()
    const deduped = feedItems.filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })

    // Interleave: posts as base, insert proposal at position 2-3, trending at 5-7, suggestion at 8-10
    const posts = deduped.filter(i => i.type === 'post' || i.type === 'donation_event')
    const specials = deduped.filter(i => i.type === 'proposal' || i.type === 'trending' || i.type === 'suggested_follow')

    const final: FeedItem[] = []
    let specialIdx = 0
    for (let i = 0; i < posts.length; i++) {
      final.push(posts[i])
      if ((i === 2 || i === 5 || i === 8) && specialIdx < specials.length) {
        final.push(specials[specialIdx++])
      }
    }
    // Append remaining specials
    while (specialIdx < specials.length) {
      final.push(specials[specialIdx++])
    }

    return NextResponse.json({ feed: final, total: final.length })
  } catch (error) {
    console.error('Smart feed error:', error)
    return NextResponse.json({ feed: [], total: 0 })
  }
}
