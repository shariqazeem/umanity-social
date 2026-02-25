'use client'

import { useState, useEffect } from 'react'

interface ProfileCardProps {
  username: string
}

export function ProfileCard({ username }: ProfileCardProps) {
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  useEffect(() => {
    fetchProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  const fetchProfile = async () => {
    try {
      const [followersRes, followingRes] = await Promise.allSettled([
        fetch(`/api/social/follow?type=followers&username=${username}`),
        fetch(`/api/social/follow?type=following&username=${username}`),
      ])

      if (followersRes.status === 'fulfilled') {
        const data = await followersRes.value.json()
        setFollowerCount(Array.isArray(data.followers) ? data.followers.length : 0)
      }

      if (followingRes.status === 'fulfilled') {
        const data = await followingRes.value.json()
        setFollowingCount(Array.isArray(data.following) ? data.following.length : 0)
      }
    } catch {
      // Profile may not exist on Tapestry yet
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#111] flex items-center justify-center">
            <span className="text-sm font-semibold text-white">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-sm">@{username}</p>
            <p className="text-[11px] text-gray-400">Umanity Member</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="text-sm font-bold counter">{followerCount}</div>
            <div className="text-[10px] text-gray-400">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold counter">{followingCount}</div>
            <div className="text-[10px] text-gray-400">Following</div>
          </div>
        </div>
      </div>
    </div>
  )
}
