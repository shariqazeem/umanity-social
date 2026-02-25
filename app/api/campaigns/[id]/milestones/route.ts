import { NextRequest, NextResponse } from 'next/server'
import { getMilestones } from '@/lib/campaigns'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const milestones = await getMilestones(id)
    return NextResponse.json({ success: true, milestones })
  } catch (error: any) {
    console.error('Milestones GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
