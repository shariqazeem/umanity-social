import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/tapestry'
import { supabase } from '@/lib/supabase'

// GET — Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_address', address)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        // Table may not exist yet — return empty
        console.error('Notifications fetch error:', error)
        return NextResponse.json({ notifications: [], unreadCount: 0 })
      }

      const notifications = (data || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        from_username: n.from_username || null,
        created_at: n.created_at,
        read: n.read ?? false,
      }))

      const unreadCount = notifications.filter((n: any) => !n.read).length

      return NextResponse.json({ notifications, unreadCount })
    } catch {
      // Table doesn't exist — return empty gracefully
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }
  } catch (error) {
    console.error('Notification GET error:', error)
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }
}

// POST — Send notification (Tapestry push OR in-app Supabase notification)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profileId, title, body: notifBody, recipientAddress, type, message, fromUsername } = body

    // In-app notification (stored in Supabase)
    if (recipientAddress && message) {
      try {
        await supabase.from('notifications').insert({
          recipient_address: recipientAddress,
          type: type || 'donation',
          message,
          from_username: fromUsername || null,
          read: false,
        })
      } catch {
        // Table may not exist — non-blocking
      }

      // Also try Tapestry push if we have the profile
      if (fromUsername) {
        try {
          await sendNotification(fromUsername, 'Impact Dare', message)
        } catch {
          // Push is non-blocking
        }
      }

      return NextResponse.json({ success: true })
    }

    // Tapestry push notification (legacy)
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

// PATCH — Mark all notifications as read for a user
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_address', address)
        .eq('read', false)
    } catch {
      // Table may not exist — non-blocking
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification PATCH error:', error)
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}
