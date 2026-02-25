import { NextRequest, NextResponse } from 'next/server'
import { createDonation, updateUserDonation, getAllDonations, getDonationStats, findUser } from '@/lib/storage'
import { calculateRewardPoints } from '@/lib/constants'
import { createPost } from '@/lib/tapestry'
import { recordImpactNFT } from '@/lib/nft'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { donor, amount, signature, type } = body

    if (!donor || !amount || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const solAmount = parseFloat(amount)

    // Calculate rewards using unified formula: 1 SOL = 1000 points
    const rewardPoints = calculateRewardPoints(solAmount)

    // Create donation record
    const donation = await createDonation({
      donor,
      amount: solAmount,
      signature,
      type: type || 'one-tap',
      rewardPointsEarned: rewardPoints,
      status: 'pending',
    })

    if (!donation) {
      return NextResponse.json({ error: 'Failed to record donation' }, { status: 500 })
    }

    // Update donor stats
    await updateUserDonation(donor, solAmount, rewardPoints)

    // Auto-create social post via Tapestry (non-blocking)
    try {
      const user = await findUser(donor)
      if (user) {
        await createPost(user.username, `Donated ${solAmount} SOL via One-Tap on Umanity! Every bit helps. 💚`, {
          type: 'donation',
          amount: String(solAmount),
          cause: 'One-Tap Donation',
        })
      }
    } catch (e) {
      console.error('Social post creation failed (non-blocking):', e)
    }

    // Mint Impact NFT (non-blocking)
    try {
      await recordImpactNFT(donor, 'One-Tap Donation', solAmount, donation?.id, signature)
    } catch (e) {
      console.error('NFT mint failed (non-blocking):', e)
    }

    return NextResponse.json({
      success: true,
      donation,
      rewardPointsEarned: rewardPoints,
      message: `Donation recorded! You earned ${rewardPoints} reward points!`
    })
  } catch (error) {
    console.error('Donation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const donations = await getAllDonations()
    const stats = await getDonationStats()

    return NextResponse.json({
      donations,
      stats
    })
  } catch (error) {
    console.error('Get donations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
