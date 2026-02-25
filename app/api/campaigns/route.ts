import { NextRequest, NextResponse } from 'next/server'
import { getCampaigns, createCampaign } from '@/lib/campaigns'

export async function GET() {
  try {
    const campaigns = await getCampaigns()
    return NextResponse.json({ success: true, campaigns })
  } catch (error: any) {
    console.error('Campaigns GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pool_id, recipient, target_amount, deadline, is_active } = body

    if (!pool_id || !recipient || !target_amount || !deadline) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const campaign = await createCampaign({
      pool_id,
      recipient,
      target_amount,
      total_raised: 0,
      deadline,
      is_active: is_active ?? true,
    })

    return NextResponse.json({ success: true, campaign })
  } catch (error: any) {
    console.error('Campaigns POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
