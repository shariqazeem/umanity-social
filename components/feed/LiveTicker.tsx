'use client'

import { useState, useEffect } from 'react'

interface TickerItem {
  text: string
  type: 'donation' | 'dare' | 'milestone' | 'join'
}

export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/activity?limit=10')
      const data = await res.json()
      const activities = data.activities || data.donations || []

      const mapped: TickerItem[] = activities.slice(0, 10).map((a: any) => {
        if (a.type === 'donation' || a.amount) {
          return {
            text: `@${a.username || a.donor_username || 'anon'} donated ${(Number(a.amount) || 0).toFixed(2)} SOL to ${a.pool_name || a.cause || 'a cause'}`,
            type: 'donation' as const,
          }
        }
        return {
          text: `@${a.username || 'anon'} joined Umanity`,
          type: 'join' as const,
        }
      })

      if (mapped.length > 0) {
        setItems(mapped)
        setLoaded(true)
      }
      // No fallback — only show ticker when real activity exists
    } catch {
      // No data available — ticker stays hidden
    }
  }

  if (!loaded || items.length === 0) return null

  const tickerText = items.map(i => {
    const icon = i.type === 'donation' ? '\u{1F49A}' : i.type === 'dare' ? '\u26A1' : '\u2726'
    return `${icon} ${i.text}`
  }).join('    //    ')

  // Double the text for seamless looping
  const doubled = `${tickerText}    //    ${tickerText}    //    `

  return (
    <div className="ticker-container bg-gray-50/80 backdrop-blur-sm border-b border-black/[0.03] py-2 px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Live</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-content text-[11px] text-gray-400 font-medium">
            {doubled}
          </div>
        </div>
      </div>
    </div>
  )
}
