import { NextRequest, NextResponse } from 'next/server'
import { getCommentReplies } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const commentId = request.nextUrl.searchParams.get('commentId')
    if (!commentId) {
      return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })
    }
    const replies = await getCommentReplies(commentId)
    return NextResponse.json(replies)
  } catch (error) {
    console.error('Comment replies error:', error)
    return NextResponse.json({ replies: [] })
  }
}
