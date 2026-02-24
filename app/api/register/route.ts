import { NextRequest, NextResponse } from 'next/server'
import { createUser, findUser, findUserByUsername, getAllUsers } from '@/lib/storage'
import { findOrCreateProfile, createPost } from '@/lib/tapestry'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, username, displayName, bio } = body

    if (!address || !username || !displayName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate username
    if (username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: 'Username must be 3-30 characters' }, { status: 400 })
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Username can only contain lowercase letters, numbers, and underscores' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await findUser(address)
    if (existingUser) {
      return NextResponse.json({ error: 'This wallet is already registered' }, { status: 400 })
    }

    const existingUsername = await findUserByUsername(username)
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    // Create user with welcome bonus
    const user = await createUser({
      address,
      username: username.toLowerCase(),
      displayName,
      bio: bio || '',
    })

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create Tapestry social profile
    try {
      await findOrCreateProfile(address, username.toLowerCase())
    } catch (tapestryError) {
      console.error('Tapestry profile creation error (non-blocking):', tapestryError)
    }

    // Auto-create "Joined RISEN" post
    try {
      await createPost(username.toLowerCase(), 'Just joined RISEN! Ready to make an impact on Solana. 🌱', { type: 'joined' })
    } catch (postError) {
      console.error('Auto-post creation error (non-blocking):', postError)
    }

    return NextResponse.json({
      success: true,
      user,
      message: 'Registration successful! You received 50 welcome bonus points!'
    })
  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const users = await getAllUsers()
    return NextResponse.json({
      users: users.map(u => ({
        ...u,
        // Privacy: show preview only
        addressPreview: `${u.address.slice(0, 4)}...${u.address.slice(-4)}`
      })),
      totalUsers: users.length
    })
  } catch (error) {
    console.error('Get users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
