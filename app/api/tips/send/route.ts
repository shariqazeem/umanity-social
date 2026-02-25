import { NextRequest, NextResponse } from 'next/server'
import { createTip, updateSenderStats, updateRecipientStats, findUser } from '@/lib/storage'
import { calculateRewardPoints } from '@/lib/constants'
import { createPost } from '@/lib/tapestry'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sender, recipient, recipientUsername, amount, message, signature } = body

    if (!sender || !recipient || !amount || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const solAmount = parseFloat(amount)

    // Calculate rewards using unified formula: 1 SOL = 1000 points
    const totalReward = calculateRewardPoints(solAmount)

    // Create tip record
    const tip = await createTip({
      sender,
      recipient,
      recipientUsername: recipientUsername || 'Unknown',
      amount: solAmount,
      message: message || '',
      signature,
      rewardPointsEarned: totalReward,
    })

    if (!tip) {
      return NextResponse.json({ error: 'Failed to record tip' }, { status: 500 })
    }

    // Update sender stats and rewards
    await updateSenderStats(sender, solAmount, totalReward)

    // Update recipient stats
    await updateRecipientStats(recipient, solAmount)

    // Auto-create social post via Tapestry (non-blocking)
    try {
      const user = await findUser(sender)
      if (user) {
        await createPost(user.username, `Sent ${solAmount} SOL to @${recipientUsername || 'a friend'} on Umanity! ⚡`, {
          type: 'tip',
          amount: String(solAmount),
          recipient: recipientUsername || recipient,
        })
      }
    } catch (e) {
      console.error('Social post creation failed (non-blocking):', e)
    }

    return NextResponse.json({
      success: true,
      tip,
      rewardPointsEarned: totalReward,
      message: `Tip sent! You earned ${totalReward} reward points!`
    })
  } catch (error) {
    console.error('Tip API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { getAllTips } = await import('@/lib/storage')
    const tips = await getAllTips()

    return NextResponse.json({
      tips,
      totalTips: tips.reduce((sum, t) => sum + t.amount, 0)
    })
  } catch (error) {
    console.error('Get tips error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
