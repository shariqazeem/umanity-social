import { NextRequest, NextResponse } from 'next/server'
import { createPoolDonation, updatePoolStats, updateUserDonation, getAllPoolDonations, findUser } from '@/lib/storage'
import { calculateRewardPoints } from '@/lib/constants'
import { createPost } from '@/lib/tapestry'
import { recordImpactNFT } from '@/lib/nft'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { donor, pool, poolName, amount, signature } = body

    if (!donor || !pool || !amount || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const solAmount = parseFloat(amount)

    // Calculate rewards using unified formula: 1 SOL = 1000 points
    const rewardPoints = calculateRewardPoints(solAmount)

    // Create pool donation record
    const donation = await createPoolDonation({
      donor,
      poolId: pool,
      poolName: poolName || 'Unknown Pool',
      amount: solAmount,
      signature,
      rewardPointsEarned: rewardPoints
    })

    if (!donation) {
      return NextResponse.json({ error: 'Failed to record donation' }, { status: 500 })
    }

    // Update pool stats (total raised)
    // Donor count is calculated dynamically from pool_donations table
    await updatePoolStats(pool, solAmount)

    // Update donor stats and reward points
    await updateUserDonation(donor, solAmount, rewardPoints)

    // Auto-create social post via Tapestry (non-blocking)
    try {
      const user = await findUser(donor)
      if (user) {
        await createPost(user.username, `Donated ${solAmount} SOL to ${poolName || 'a cause'} on Umanity! 🌍`, {
          type: 'donation',
          amount: String(solAmount),
          cause: poolName || pool,
        })
      }
    } catch (e) {
      console.error('Social post creation failed (non-blocking):', e)
    }

    // Mint Impact NFT (non-blocking)
    try {
      await recordImpactNFT(donor, poolName || pool, solAmount, donation?.id, signature)
    } catch (e) {
      console.error('NFT mint failed (non-blocking):', e)
    }

    return NextResponse.json({
      success: true,
      donation,
      rewardPointsEarned: rewardPoints,
      message: `Successfully donated ${amount} SOL. You earned ${rewardPoints} reward points!`
    })
  } catch (error) {
    console.error('Pool donation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const donations = await getAllPoolDonations()

    const stats = {
      totalDonations: donations.reduce((sum, d) => sum + d.amount, 0),
      totalDonors: new Set(donations.map(d => d.donor)).size,
      totalRewardsDistributed: donations.reduce((sum, d) => sum + d.rewardPointsEarned, 0),
      recentDonations: donations.slice(0, 10)
    }

    return NextResponse.json({
      donations,
      stats
    })
  } catch (error) {
    console.error('Get pool donations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
