import { NextRequest, NextResponse } from 'next/server'
import { getAllPosts, getPostsByProfile } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    let rawPosts
    if (username) {
      rawPosts = await getPostsByProfile(username)
    } else {
      rawPosts = await getAllPosts()
    }

    // Transform Tapestry format to our Post format
    const posts = (rawPosts || []).map((item: any) => {
      const content = item.content || item
      const author = item.authorProfile || item.profile || {}
      const counts = item.socialCounts || {}

      // Extract username from multiple possible locations
      const postUsername = author.username
        || author.id
        || content.profileId
        || item.profileId
        || item.username
        || 'unknown'

      // Extract text content
      let textContent = ''
      if (typeof content.content === 'string') {
        textContent = content.content
      } else if (typeof content === 'string') {
        textContent = content
      } else if (typeof item.text === 'string') {
        textContent = item.text
      }
      // Also check properties array
      if (!textContent && Array.isArray(content.properties)) {
        const contentProp = content.properties.find((p: any) => p.key === 'content')
        if (contentProp) textContent = contentProp.value
      }

      // Extract properties into a flat object
      const properties: Record<string, string> = {}
      if (content.type) properties.type = content.type
      if (content.contentType) properties.contentType = content.contentType
      if (Array.isArray(content.properties)) {
        for (const p of content.properties) {
          if (p.key && p.value) properties[p.key] = p.value
        }
      }

      return {
        id: content.id || content.externalLinkURL || item.id || '',
        username: postUsername,
        profileId: postUsername,
        content: textContent,
        properties,
        createdAt: content.created_at ? new Date(content.created_at).toISOString() : undefined,
        likes: counts.likeCount || item.likeCount || 0,
        comments: counts.commentCount || item.commentCount || 0,
        likeCount: counts.likeCount || item.likeCount || 0,
        commentCount: counts.commentCount || item.commentCount || 0,
      }
    })

    // Deduplicate by username+content
    const seenContent = new Set<string>()
    const deduped = posts.filter((p: any) => {
      if (p.username && p.content) {
        const key = `${p.username}::${p.content}`
        if (seenContent.has(key)) return false
        seenContent.add(key)
      }
      return true
    })

    // Sort newest first
    deduped.sort((a: any, b: any) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })

    return NextResponse.json({ success: true, posts: deduped })
  } catch (error: any) {
    console.error('Feed error:', error)
    return NextResponse.json({ success: true, posts: [] })
  }
}
