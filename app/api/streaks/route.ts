import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address')
    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    // Fetch all donations for this donor, ordered by timestamp
    const { data: donations, error } = await supabase
      .from('pool_donations')
      .select('timestamp')
      .eq('donor', address)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Streak query error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!donations || donations.length === 0) {
      return NextResponse.json({
        currentStreak: 0,
        longestStreak: 0,
        lastDonationDate: null,
        totalDays: 0,
        donationDays: [],
      })
    }

    // Extract unique donation dates (in UTC, date-only strings)
    const donationDatesSet = new Set<string>()
    for (const d of donations) {
      const date = new Date(d.timestamp).toISOString().split('T')[0]
      donationDatesSet.add(date)
    }

    const sortedDays = Array.from(donationDatesSet).sort()
    const totalDays = sortedDays.length
    const lastDonationDate = sortedDays[sortedDays.length - 1]

    // Calculate longest streak
    let longestStreak = 1
    let runningStreak = 1

    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diffMs = curr.getTime() - prev.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (diffDays === 1) {
        runningStreak++
        longestStreak = Math.max(longestStreak, runningStreak)
      } else {
        runningStreak = 1
      }
    }

    // Calculate current streak (must end today or yesterday)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    let currentStreak = 0
    if (lastDonationDate === todayStr || lastDonationDate === yesterdayStr) {
      // Walk backwards from the last donation date counting consecutive days
      currentStreak = 1
      for (let i = sortedDays.length - 2; i >= 0; i--) {
        const curr = new Date(sortedDays[i + 1])
        const prev = new Date(sortedDays[i])
        const diffMs = curr.getTime() - prev.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (diffDays === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }

    // Return last 7 days of donation activity for the calendar row
    const donationDays: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if (donationDatesSet.has(dateStr)) {
        donationDays.push(dateStr)
      }
    }

    return NextResponse.json({
      currentStreak,
      longestStreak,
      lastDonationDate,
      totalDays,
      donationDays,
    })
  } catch (error) {
    console.error('Streak API error:', error)
    return NextResponse.json({
      currentStreak: 0,
      longestStreak: 0,
      lastDonationDate: null,
      totalDays: 0,
      donationDays: [],
    })
  }
}
