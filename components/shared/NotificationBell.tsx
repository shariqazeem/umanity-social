'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { GradientAvatar } from './GradientAvatar'

interface Notification {
  id: string
  type: 'donation' | 'follow' | 'vote' | 'milestone' | 'dare'
  message: string
  from_username?: string
  created_at: string
  read: boolean
}

interface NotificationBellProps {
  address: string
  username: string
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function notificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'donation': return '\u2661' // heart
    case 'follow': return '\u2022' // bullet
    case 'vote': return '\u2B21' // hexagon
    case 'milestone': return '\u2605' // star
    case 'dare': return '\u26A1' // lightning
    default: return '\u25CF'
  }
}

function notificationColor(type: Notification['type']): string {
  switch (type) {
    case 'donation': return 'text-emerald-500'
    case 'follow': return 'text-blue-500'
    case 'vote': return 'text-purple-500'
    case 'milestone': return 'text-amber-500'
    case 'dare': return 'text-orange-500'
    default: return 'text-gray-400'
  }
}

export function NotificationBell({ address, username }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/social/notifications?address=${address}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.notifications) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount ?? data.notifications.filter((n: Notification) => !n.read).length)
      }
    } catch {
      // Silently fail -- notifications are non-critical
    }
  }, [address])

  // Initial fetch + polling every 30 seconds
  useEffect(() => {
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Mark all as read when opening
  const handleOpen = async () => {
    const opening = !isOpen
    setIsOpen(opening)
    if (opening && unreadCount > 0) {
      setUnreadCount(0)
      try {
        await fetch('/api/social/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        // Mark local state as read
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      } catch {
        // Non-blocking
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors"
        aria-label="Notifications"
      >
        {/* Bell icon */}
        <svg
          className="w-[18px] h-[18px] text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-lg border border-black/[0.06] overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-black/[0.04]">
            <h3 className="text-[13px] font-semibold text-gray-900">Notifications</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-gray-200 text-2xl mb-2">
                  <svg className="w-8 h-8 mx-auto text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                <p className="text-[12px] text-gray-400">No notifications yet</p>
                <p className="text-[11px] text-gray-300 mt-1">You&apos;ll see activity from your network here</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      !notif.read ? 'bg-gray-50/50' : ''
                    }`}
                  >
                    {notif.from_username ? (
                      <GradientAvatar username={notif.from_username} size="sm" />
                    ) : (
                      <div className={`w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 ${notificationColor(notif.type)}`}>
                        <span className="text-xs">{notificationIcon(notif.type)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-gray-700 leading-snug">{notif.message}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">{timeAgo(notif.created_at)}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
