import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/tapestry'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profileId, title, body: notifBody } = body

    if (!profileId || !title || !notifBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await sendNotification(profileId, title, notifBody)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
