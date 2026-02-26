import { NextRequest, NextResponse } from 'next/server'
import { createComment, getComments } from '@/lib/tapestry'

export async function POST(request: NextRequest) {
  try {
    const { username, contentId, text } = await request.json()

    if (!username || !contentId || !text) {
      return NextResponse.json({ error: 'username, contentId, and text required' }, { status: 400 })
    }

    // username is the profileId in Tapestry
    const comment = await createComment(username, contentId, text)
    return NextResponse.json({ success: true, comment })
  } catch (error: any) {
    console.error('Comment error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')

    if (!contentId) {
      return NextResponse.json({ error: 'contentId required' }, { status: 400 })
    }

    const result = await getComments(contentId)
    const comments = Array.isArray(result) ? result : (result?.comments || result?.data || [])
    return NextResponse.json({ success: true, comments: Array.isArray(comments) ? comments : [] })
  } catch (error: any) {
    console.error('Get comments error:', error)
    return NextResponse.json({ success: true, comments: [] })
  }
}
