import { NextRequest, NextResponse } from 'next/server'
import { updateProfile } from '@/lib/tapestry'
import { supabase } from '@/lib/supabase'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, bio, image } = body

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    }

    // Update Tapestry profile
    const updates: Record<string, string> = {}
    if (bio !== undefined) updates.bio = bio
    if (image !== undefined) updates.image = image

    await updateProfile(username, updates)

    // Also update Supabase bio if provided
    if (bio !== undefined) {
      await supabase
        .from('users')
        .update({ bio })
        .eq('username', username)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
