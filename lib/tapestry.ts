const BASE_URL = 'https://api.usetapestry.dev/api/v1'
const API_KEY = process.env.TAPESTRY_API_KEY || ''

function buildUrl(path: string, params?: Record<string, string>) {
  const u = new URL(`${BASE_URL}${path}`)
  u.searchParams.set('apiKey', API_KEY)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v)
    }
  }
  return u.toString()
}

async function tapestryFetch(path: string, options?: RequestInit & { params?: Record<string, string> }) {
  const { params, ...fetchOpts } = options || {}
  const res = await fetch(buildUrl(path, params), {
    ...fetchOpts,
    headers: {
      'Content-Type': 'application/json',
      ...(fetchOpts?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Tapestry API error ${res.status}: ${text}`)
  }
  return res.json()
}

// ---- Profiles ----

export async function findOrCreateProfile(walletAddress: string, username: string, bio?: string, referredBy?: string) {
  const body: Record<string, string> = {
    walletAddress,
    username,
    bio: bio || '',
    blockchain: 'SOLANA',
  }
  if (referredBy) {
    body.referredById = referredBy
  }
  return tapestryFetch('/profiles/findOrCreate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getProfile(profileId: string) {
  return tapestryFetch(`/profiles/${profileId}`)
}

export async function getProfileByWallet(walletAddress: string) {
  return tapestryFetch('/profiles/', {
    params: { walletAddress },
  })
}

// ---- Follows ----

export async function createFollow(followerId: string, followeeId: string) {
  return tapestryFetch('/followers/add', {
    method: 'POST',
    body: JSON.stringify({
      startId: followerId,
      endId: followeeId,
    }),
  })
}

export async function removeFollow(followerId: string, followeeId: string) {
  return tapestryFetch('/followers/remove', {
    method: 'POST',
    body: JSON.stringify({
      startId: followerId,
      endId: followeeId,
    }),
  })
}

export async function checkFollow(followerId: string, followeeId: string) {
  try {
    const data = await tapestryFetch('/followers/state', {
      params: {
        startId: followerId,
        endId: followeeId,
      },
    })
    return data.isFollowing ?? false
  } catch {
    return false
  }
}

export async function getFollowers(profileId: string) {
  const data = await tapestryFetch(`/profiles/${profileId}/followers`)
  // API returns { profiles: [], page, pageSize, totalCount }
  return data.profiles || []
}

export async function getFollowing(profileId: string) {
  const data = await tapestryFetch(`/profiles/${profileId}/following`)
  // API returns { profiles: [], page, pageSize, totalCount }
  return data.profiles || []
}

// ---- Content (Posts) ----

export async function createPost(profileId: string, content: string, properties?: Record<string, string>) {
  const id = `post_${profileId}_${Date.now()}`
  const props = [
    { key: 'content', value: content },
    { key: 'contentType', value: 'post' },
    ...(properties
      ? Object.entries(properties).map(([key, value]) => ({ key, value }))
      : []),
  ]

  return tapestryFetch('/contents/findOrCreate', {
    method: 'POST',
    body: JSON.stringify({
      id,
      profileId,
      properties: props,
    }),
  })
}

export async function getPostsByProfile(profileId: string) {
  const data = await tapestryFetch('/contents/', {
    params: { profileId },
  })
  // API returns { contents: [...], page, pageSize, totalCount }
  return data.contents || []
}

export async function getPost(contentId: string) {
  return tapestryFetch(`/contents/${contentId}`)
}

export async function getAllPosts() {
  const data = await tapestryFetch('/contents/')
  // API returns { contents: [...], page, pageSize, totalCount }
  return data.contents || []
}

// ---- Likes ----

export async function createLike(profileId: string, contentId: string) {
  return tapestryFetch(`/likes/${contentId}`, {
    method: 'POST',
    body: JSON.stringify({
      startId: profileId,
    }),
  })
}

export async function removeLike(profileId: string, contentId: string) {
  return tapestryFetch(`/likes/${contentId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      startId: profileId,
    }),
  })
}

export async function checkLike(profileId: string, contentId: string) {
  try {
    const data = await tapestryFetch(`/contents/${contentId}`, {
      params: { requestingId: profileId },
    })
    return data?.isLiked ?? false
  } catch {
    return false
  }
}

// ---- Search ----

export async function searchProfiles(query: string) {
  const data = await tapestryFetch('/search/profiles', {
    params: { query },
  })
  return data.profiles || []
}

// ---- Activity Feed ----

export async function getNetworkActivityFeed(username: string, page?: number, pageSize?: number) {
  const params: Record<string, string> = { username }
  if (page !== undefined) params.page = String(page)
  if (pageSize !== undefined) params.pageSize = String(pageSize)
  const data = await tapestryFetch('/activity/feed', { params })
  return data
}

// ---- Suggested Profiles ----

export async function getSuggestedProfiles(identifier: string) {
  const data = await tapestryFetch(`/profiles/suggested/${identifier}`)
  return data.profiles || []
}

// ---- Social Proof: Following Who Follow ----

export async function getFollowingWhoFollow(myId: string, targetId: string) {
  const data = await tapestryFetch(`/profiles/${targetId}/following-who-follow`, {
    params: { requestingId: myId },
  })
  return data.profiles || []
}

// ---- Referral Chain ----

export async function getReferralChain(profileId: string, depth?: number) {
  const params: Record<string, string> = {}
  if (depth !== undefined) params.depth = String(depth)
  const data = await tapestryFetch(`/profiles/${profileId}/referrals`, { params })
  return data
}

// ---- Content with Like Status ----

export async function getPostWithLikeStatus(contentId: string, requestingId: string) {
  const data = await tapestryFetch(`/contents/${contentId}`, {
    params: { requestingId },
  })
  return data
}

// ---- Notifications ----

export async function sendNotification(profileId: string, title: string, body: string) {
  return tapestryFetch(`/profiles/${profileId}/notification`, {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  })
}

// ---- Filtered Content ----

export async function getFilteredContent(filters: {
  filterField?: string
  filterValue?: string
  orderByField?: string
  orderDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}) {
  const params: Record<string, string> = {}
  if (filters.filterField) params.filterField = filters.filterField
  if (filters.filterValue) params.filterValue = filters.filterValue
  if (filters.orderByField) params.orderByField = filters.orderByField
  if (filters.orderDirection) params.orderDirection = filters.orderDirection
  if (filters.page !== undefined) params.page = String(filters.page)
  if (filters.pageSize !== undefined) params.pageSize = String(filters.pageSize)
  const data = await tapestryFetch('/contents/', { params })
  return data.contents || []
}

// ---- Comment Replies ----

export async function getCommentReplies(commentId: string) {
  const data = await tapestryFetch(`/comments/${commentId}/replies`)
  return data
}

// ---- Update Profile ----

export async function updateProfile(profileId: string, updates: { bio?: string; image?: string; username?: string }) {
  return tapestryFetch(`/profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

// ---- Leaderboard ----

export async function getTapestryLeaderboard(namespace: string) {
  const data = await tapestryFetch(`/leaderboards/${namespace}`)
  return data
}

// ---- Batch Content ----

export async function batchGetContents(ids: string[]) {
  const data = await tapestryFetch('/contents/batch/read', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
  return data.contents || []
}

// ---- Comments ----

export async function createComment(profileId: string, contentId: string, text: string) {
  return tapestryFetch('/comments/', {
    method: 'POST',
    body: JSON.stringify({
      profileId,
      contentId,
      text,
    }),
  })
}

export async function getComments(contentId: string) {
  return tapestryFetch('/comments/', {
    params: { contentId },
  })
}
