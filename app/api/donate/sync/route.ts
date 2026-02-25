import { NextRequest, NextResponse } from 'next/server'
import { createDonation, createPoolDonation, updatePoolStats, updateUserDonation, findUser } from '@/lib/storage'
import { calculateRewardPoints, MILESTONES } from '@/lib/constants'
import { createPost, getFollowers } from '@/lib/tapestry'
import { recordImpactNFT } from '@/lib/nft'
import { getCampaignByPoolId, updateCampaignTotalRaised, getMilestones } from '@/lib/campaigns'
import { createMilestoneProposal } from '@/lib/governance'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { donor, amount, signature, pool, poolName, type } = body

    if (!donor || !amount || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const solAmount = parseFloat(amount)
    const rewardPoints = calculateRewardPoints(solAmount)

    let donation = null
    if (type === 'one-tap' || type === 'pool') {
      if (pool) {
        // Ensure pool row exists in Supabase before inserting donation (FK constraint)
        await updatePoolStats(pool, solAmount, poolName)
        // Now create the pool donation record
        donation = await createPoolDonation({
          donor,
          poolId: pool,
          poolName: poolName || pool,
          amount: solAmount,
          signature,
          rewardPointsEarned: rewardPoints,
        })
      } else {
        // One-tap donation
        donation = await createDonation({
          donor,
          amount: solAmount,
          signature,
          type: type || 'one-tap',
          rewardPointsEarned: rewardPoints,
          status: 'pending',
        })
      }
    } else {
      donation = await createDonation({
        donor,
        amount: solAmount,
        signature,
        type: type || 'donation',
        rewardPointsEarned: rewardPoints,
        status: 'pending',
      })
    }

    // Update user stats
    await updateUserDonation(donor, solAmount, rewardPoints)

    // Check milestones and create posts
    let milestone: string | null = null
    try {
      const user = await findUser(donor)
      if (user) {
        const totalDonated = (user.totalDonated || 0) + solAmount
        const donationCount = (user.donationCount || 0) + 1

        // First donation
        if (donationCount === 1) {
          milestone = MILESTONES.FIRST_DONATION.key
          await createPost(user.username, MILESTONES.FIRST_DONATION.message, {
            type: 'milestone',
            milestone: 'first_donation',
          })
        }
        // 0.1 SOL total
        else if (totalDonated >= 0.1 && totalDonated - solAmount < 0.1) {
          milestone = MILESTONES.TOTAL_01_SOL.key
          await createPost(user.username, MILESTONES.TOTAL_01_SOL.message, {
            type: 'milestone',
            milestone: 'total_01_sol',
          })
        }
        // 5 donations
        else if (donationCount === 5) {
          milestone = MILESTONES.FIVE_DONATIONS.key
          await createPost(user.username, MILESTONES.FIVE_DONATIONS.message, {
            type: 'milestone',
            milestone: 'five_donations',
          })
        }
        // Sprout tier (100 points)
        else if (
          (user.rewardPoints || 0) + rewardPoints >= MILESTONES.SPROUT_TIER.threshold &&
          (user.rewardPoints || 0) < MILESTONES.SPROUT_TIER.threshold
        ) {
          milestone = MILESTONES.SPROUT_TIER.key
          await createPost(user.username, MILESTONES.SPROUT_TIER.message, {
            type: 'milestone',
            milestone: 'sprout_tier',
          })
        }
        // Sapling tier (500 points)
        else if (
          (user.rewardPoints || 0) + rewardPoints >= MILESTONES.SAPLING_TIER.threshold &&
          (user.rewardPoints || 0) < MILESTONES.SAPLING_TIER.threshold
        ) {
          milestone = MILESTONES.SAPLING_TIER.key
          await createPost(user.username, MILESTONES.SAPLING_TIER.message, {
            type: 'milestone',
            milestone: 'sapling_tier',
          })
        }

        // Also create a regular donation post
        const causeLabel = poolName || pool || 'One-Tap Donation'
        await createPost(user.username, `Donated ${solAmount} SOL to ${causeLabel} on Umanity! 💚`, {
          type: 'donation',
          amount: String(solAmount),
          cause: causeLabel,
        })
      }
    } catch (e) {
      console.error('Milestone/post creation failed (non-blocking):', e)
    }

    // Create notifications for donor's followers (non-blocking)
    try {
      const donorUser = await findUser(donor)
      if (donorUser) {
        const causeLabel = poolName || pool || 'One-Tap Donation'
        const followers = await getFollowers(donorUser.username)

        if (followers && followers.length > 0) {
          // Look up each follower's wallet address to set as recipient
          const notificationRows = []
          for (const follower of followers) {
            const followerUsername = follower.username || follower.id
            if (!followerUsername) continue

            // Find the follower's wallet address from our users table
            const { data: followerUser } = await supabase
              .from('users')
              .select('address')
              .eq('username', followerUsername)
              .single()

            if (followerUser?.address) {
              notificationRows.push({
                recipient_address: followerUser.address,
                type: 'donation',
                message: `@${donorUser.username} donated ${solAmount} SOL to ${causeLabel}`,
                from_username: donorUser.username,
                read: false,
              })
            }
          }

          if (notificationRows.length > 0) {
            await supabase.from('notifications').insert(notificationRows)
          }
        }
      }
    } catch (e) {
      console.error('Notification creation failed (non-blocking):', e)
    }

    // Mint Impact NFT (non-blocking)
    try {
      await recordImpactNFT(donor, poolName || pool || 'One-Tap Donation', solAmount, donation?.id, signature)
    } catch (e) {
      console.error('NFT mint failed (non-blocking):', e)
    }

    // Campaign tracking + auto-proposal creation (non-blocking)
    if (pool) {
      try {
        const campaign = await getCampaignByPoolId(pool)
        if (campaign) {
          const prevRaised = campaign.total_raised || 0
          await updateCampaignTotalRaised(campaign.id, solAmount)
          const newRaised = prevRaised + solAmount

          // Check if any milestone cumulative threshold was crossed
          const milestones = await getMilestones(campaign.id)
          let cumulativePct = 0
          for (const m of milestones) {
            cumulativePct += m.percentage
            const thresholdAmount = (cumulativePct / 100) * campaign.target_amount
            // If we just crossed this threshold
            if (prevRaised < thresholdAmount && newRaised >= thresholdAmount && m.status === 'pending') {
              await createMilestoneProposal(
                campaign.id,
                m.index,
                poolName || pool,
                m.description,
                donor
              )
            }
          }
        }
      } catch (e) {
        console.error('Campaign tracking failed (non-blocking):', e)
      }
    }

    return NextResponse.json({
      success: true,
      donation,
      rewardPoints,
      milestone,
    })
  } catch (error) {
    console.error('Donate sync API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
