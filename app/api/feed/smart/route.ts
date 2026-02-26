import { NextRequest, NextResponse } from 'next/server'
import { getNetworkActivityFeed, getFilteredContent, getSuggestedProfiles, getFollowing } from '@/lib/tapestry'
import { supabase } from '@/lib/supabase'
import { calculateImpactScore } from '@/lib/impact-score'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    const address = request.nextUrl.searchParams.get('address')
    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    }

    // Calculate user score for governance gating (Bloom+ = 150+)
    let userScore = 0
    if (address) {
      try {
        const score = await calculateImpactScore(address, username)
        userScore = score.total
      } catch {
        // Default to Seedling
      }
    }

    type FeedItem = {
      type: 'post' | 'donation_event' | 'proposal' | 'trending' | 'suggested_follow'
      id: string
      data: Record<string, unknown>
      timestamp?: string
    }

    const feedItems: FeedItem[] = []

    // Helper: extract username from various Tapestry content shapes
    function extractUsername(item: any): string {
      return item.username
        || item.authorProfile?.username
        || item.profile?.username
        || (typeof item.profileId === 'string' ? item.profileId : null)
        || (item.content?.profileId)
        || (item.authorProfile?.id)
        || 'unknown'
    }

    // Helper: extract text content from various Tapestry content shapes
    function extractContent(item: any): string {
      if (typeof item.content === 'string') return item.content
      if (item.content?.content) return item.content.content
      // Check properties array for content
      const props = item.properties || item.content?.properties
      if (Array.isArray(props)) {
        const contentProp = props.find((p: any) => p.key === 'content')
        if (contentProp) return contentProp.value
      }
      if (typeof props === 'object' && props?.content) return props.content
      if (typeof item.text === 'string') return item.text
      return ''
    }

    // Helper: normalize a Tapestry item into a flat data object
    function normalizeItem(item: any): Record<string, unknown> {
      const un = extractUsername(item)
      const content = extractContent(item)
      const authorProfile = item.authorProfile || item.profile || {}
      const socialCounts = item.socialCounts || {}

      // Flatten properties
      const properties: Record<string, string> = {}
      const rawProps = item.properties || item.content?.properties
      if (Array.isArray(rawProps)) {
        for (const p of rawProps) {
          if (p.key && p.value) properties[p.key] = p.value
        }
      } else if (rawProps && typeof rawProps === 'object') {
        Object.assign(properties, rawProps)
      }

      return {
        ...item,
        username: un,
        content,
        properties,
        profileId: un,
        likeCount: socialCounts.likeCount || item.likeCount || 0,
        commentCount: socialCounts.commentCount || item.commentCount || 0,
        createdAt: item.createdAt || item.created_at || item.content?.created_at,
      }
    }

    // 1. Network activity (primary feed source)
    try {
      const activityData = await getNetworkActivityFeed(username, 0, 20)
      const activities = activityData?.activities || activityData?.contents || []
      for (const item of activities) {
        const normalized = normalizeItem(item)
        feedItems.push({
          type: 'post',
          id: item.id || item.content?.id || `activity_${Date.now()}_${Math.random()}`,
          data: normalized,
          timestamp: item.createdAt || item.created_at || item.content?.created_at,
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

    // 3. Governance proposals (tier-gated: Bloom+ only, score >= 150)
    if (userScore >= 150) {
      try {
        const { data: proposals } = await supabase
          .from('governance_proposals')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3)

        for (const proposal of proposals || []) {
          feedItems.push({
            type: 'proposal',
            id: `proposal_${proposal.id}`,
            data: proposal,
            timestamp: proposal.created_at,
          })
        }
      } catch {
        // No proposals
      }
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
          id: `trending_${item.id || item.content?.id}`,
          data: normalizeItem(item),
          timestamp: item.createdAt || item.created_at || item.content?.created_at,
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
            id: item.id || item.content?.id || `global_${Date.now()}_${Math.random()}`,
            data: normalizeItem(item),
            timestamp: item.createdAt || item.created_at || item.content?.created_at,
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

    // Deduplicate by id AND by content+username combo (catches duplicate posts with different IDs)
    const seenIds = new Set<string>()
    const seenContent = new Set<string>()
    const deduped = feedItems.filter(item => {
      if (seenIds.has(item.id)) return false
      seenIds.add(item.id)

      // For posts, also deduplicate by username+content text
      if (item.type === 'post' || item.type === 'donation_event' || item.type === 'trending') {
        const username = (item.data.username as string) || ''
        const content = (item.data.content as string) || ''
        if (username && content) {
          const contentKey = `${username}::${content}`
          if (seenContent.has(contentKey)) return false
          seenContent.add(contentKey)
        }
      }

      return true
    })

    // Sort everything by timestamp, newest first
    const sorted = deduped.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return tb - ta
    })

    // Insert suggestion cards after every ~5 posts (non-disruptive)
    const posts = sorted.filter(i => i.type !== 'suggested_follow')
    const suggestions = sorted.filter(i => i.type === 'suggested_follow')

    const final: FeedItem[] = []
    let sugIdx = 0
    for (let i = 0; i < posts.length; i++) {
      final.push(posts[i])
      if (i === 4 && sugIdx < suggestions.length) {
        final.push(suggestions[sugIdx++])
      }
    }
    while (sugIdx < suggestions.length) {
      final.push(suggestions[sugIdx++])
    }

    return NextResponse.json({ feed: final, total: final.length })
  } catch (error) {
    console.error('Smart feed error:', error)
    return NextResponse.json({ feed: [], total: 0 })
  }
}
