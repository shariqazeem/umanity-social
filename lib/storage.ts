// Supabase-backed storage layer
import { supabase } from './supabase'

export interface User {
  address: string
  username: string
  displayName: string
  bio: string
  totalReceived: number
  totalSent: number
  totalDonated: number
  rewardPoints: number
  tipCountReceived: number
  tipCountSent: number
  donationCount: number
  createdAt: string
  isActive: boolean
}

export interface Donation {
  id: string
  donor: string
  amount: number
  signature: string
  timestamp: string
  type: 'one-tap' | 'custom'
  rewardPointsEarned: number
  status: 'pending' | 'distributed' | 'completed'
}

export interface Tip {
  id: string
  sender: string
  recipient: string
  recipientUsername: string
  amount: number
  message: string
  signature: string
  timestamp: string
  rewardPointsEarned: number
}

// Helper function to convert DB snake_case to camelCase
function dbUserToUser(dbUser: any): User {
  return {
    address: dbUser.address,
    username: dbUser.username,
    displayName: dbUser.display_name,
    bio: dbUser.bio,
    totalReceived: parseFloat(dbUser.total_received) || 0,
    totalSent: parseFloat(dbUser.total_sent) || 0,
    totalDonated: parseFloat(dbUser.total_donated) || 0,
    rewardPoints: dbUser.reward_points || 0,
    tipCountReceived: dbUser.tip_count_received || 0,
    tipCountSent: dbUser.tip_count_sent || 0,
    donationCount: dbUser.donation_count || 0,
    createdAt: dbUser.created_at,
    isActive: dbUser.is_active
  }
}

// Find user by address
export async function findUser(address: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('address', address)
    .single()

  if (error || !data) return null
  return dbUserToUser(data)
}

// Find user by username
export async function findUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (error || !data) return null
  return dbUserToUser(data)
}

// Create new user
export async function createUser(data: Partial<User>): Promise<User | null> {
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      address: data.address!,
      username: data.username!.toLowerCase(),
      display_name: data.displayName!,
      bio: data.bio || '',
      total_received: 0,
      total_sent: 0,
      total_donated: 0,
      reward_points: 50, // Welcome bonus
      tip_count_received: 0,
      tip_count_sent: 0,
      donation_count: 0,
      is_active: true
    })
    .select()
    .single()

  if (error || !newUser) {
    console.error('Error creating user:', error)
    return null
  }

  return dbUserToUser(newUser)
}

// Update user stats after donation
export async function updateUserDonation(address: string, amount: number, rewardPoints: number) {
  const user = await findUser(address)
  if (!user) return

  await supabase
    .from('users')
    .update({
      total_donated: user.totalDonated + amount,
      donation_count: user.donationCount + 1,
      reward_points: user.rewardPoints + rewardPoints
    })
    .eq('address', address)
}

// Update sender stats after tip
export async function updateSenderStats(address: string, amount: number, rewardPoints: number) {
  const user = await findUser(address)
  if (!user) return

  await supabase
    .from('users')
    .update({
      total_sent: user.totalSent + amount,
      tip_count_sent: user.tipCountSent + 1,
      reward_points: user.rewardPoints + rewardPoints
    })
    .eq('address', address)
}

// Update recipient stats after receiving tip
export async function updateRecipientStats(address: string, amount: number) {
  const user = await findUser(address)
  if (!user) return

  await supabase
    .from('users')
    .update({
      total_received: user.totalReceived + amount,
      tip_count_received: user.tipCountReceived + 1
    })
    .eq('address', address)
}

// Update user reward points
export async function updateUserRewards(address: string, points: number) {
  const user = await findUser(address)
  if (!user) return

  await supabase
    .from('users')
    .update({
      reward_points: user.rewardPoints + points
    })
    .eq('address', address)
}

// Get all active users
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map(dbUserToUser)
}

// Create donation record
export async function createDonation(donation: Omit<Donation, 'id' | 'timestamp'>): Promise<Donation | null> {
  const id = Date.now().toString()
  const { data, error } = await supabase
    .from('donations')
    .insert({
      id,
      donor: donation.donor,
      amount: donation.amount,
      signature: donation.signature,
      type: donation.type,
      reward_points_earned: donation.rewardPointsEarned,
      status: donation.status
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating donation:', error)
    return null
  }

  return {
    id: data.id,
    donor: data.donor,
    amount: parseFloat(data.amount),
    signature: data.signature,
    timestamp: data.timestamp,
    type: data.type,
    rewardPointsEarned: data.reward_points_earned,
    status: data.status
  }
}

// Get all donations
export async function getAllDonations(): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error || !data) return []

  return data.map(d => ({
    id: d.id,
    donor: d.donor,
    amount: parseFloat(d.amount),
    signature: d.signature,
    timestamp: d.timestamp,
    type: d.type,
    rewardPointsEarned: d.reward_points_earned,
    status: d.status
  }))
}

// Create tip record
export async function createTip(tip: Omit<Tip, 'id' | 'timestamp'>): Promise<Tip | null> {
  const id = Date.now().toString()
  const { data, error } = await supabase
    .from('tips')
    .insert({
      id,
      sender: tip.sender,
      recipient: tip.recipient,
      recipient_username: tip.recipientUsername,
      amount: tip.amount,
      message: tip.message,
      signature: tip.signature,
      reward_points_earned: tip.rewardPointsEarned
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating tip:', error)
    return null
  }

  return {
    id: data.id,
    sender: data.sender,
    recipient: data.recipient,
    recipientUsername: data.recipient_username,
    amount: parseFloat(data.amount),
    message: data.message,
    signature: data.signature,
    timestamp: data.timestamp,
    rewardPointsEarned: data.reward_points_earned
  }
}

// Get all tips
export async function getAllTips(): Promise<Tip[]> {
  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error || !data) return []

  return data.map(t => ({
    id: t.id,
    sender: t.sender,
    recipient: t.recipient,
    recipientUsername: t.recipient_username,
    amount: parseFloat(t.amount),
    message: t.message,
    signature: t.signature,
    timestamp: t.timestamp,
    rewardPointsEarned: t.reward_points_earned
  }))
}

// Get donation stats (one-tap donations only)
export async function getDonationStats() {
  const donations = await getAllDonations()
  const uniqueDonors = new Set(donations.map(d => d.donor))

  return {
    totalDonations: donations.reduce((sum, d) => sum + d.amount, 0),
    totalDonors: uniqueDonors.size,
    totalRewardsDistributed: donations.reduce((sum, d) => sum + d.rewardPointsEarned, 0),
    pendingDistribution: donations
      .filter(d => d.status === 'pending')
      .reduce((sum, d) => sum + d.amount, 0)
  }
}

// Get COMBINED platform stats (one-tap donations + pool donations)
export async function getPlatformStats() {
  const oneTapDonations = await getAllDonations()
  const poolDonations = await getAllPoolDonations()

  // Combine all donors
  const allDonors = new Set([
    ...oneTapDonations.map(d => d.donor),
    ...poolDonations.map(d => d.donor)
  ])

  const totalDonations =
    oneTapDonations.reduce((sum, d) => sum + d.amount, 0) +
    poolDonations.reduce((sum, d) => sum + d.amount, 0)

  const totalRewards =
    oneTapDonations.reduce((sum, d) => sum + d.rewardPointsEarned, 0) +
    poolDonations.reduce((sum, d) => sum + d.rewardPointsEarned, 0)

  const pendingDistribution = oneTapDonations
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + d.amount, 0)

  return {
    totalDonations,
    totalDonors: allDonors.size,
    totalRewardsDistributed: totalRewards,
    pendingDistribution,
    oneTapCount: oneTapDonations.length,
    poolDonationCount: poolDonations.length,
    totalTransactions: oneTapDonations.length + poolDonations.length
  }
}

// Get tip stats
export async function getTipStats() {
  const tips = await getAllTips()

  return {
    totalTips: tips.reduce((sum, t) => sum + t.amount, 0),
    totalTipCount: tips.length
  }
}

// Pool functions
export interface Pool {
  id: string
  name: string
  description: string
  totalDonated: number
  donorCount: number
}

export interface PoolDonation {
  id: string
  donor: string
  poolId: string
  poolName: string
  amount: number
  signature: string
  timestamp: string
  rewardPointsEarned: number
}

// Get all pools with accurate contributor counts from pool_donations
export async function getAllPools(): Promise<Pool[]> {
  const { data: poolsData, error } = await supabase
    .from('pools')
    .select('*')
    .order('id', { ascending: true })

  if (error || !poolsData) return []

  // Get all pool donations to calculate unique donor counts
  const { data: donationsData } = await supabase
    .from('pool_donations')
    .select('pool_id, donor')

  // Calculate unique donors per pool
  const donorCountMap: Record<string, Set<string>> = {}
  if (donationsData) {
    donationsData.forEach(donation => {
      if (!donorCountMap[donation.pool_id]) {
        donorCountMap[donation.pool_id] = new Set()
      }
      donorCountMap[donation.pool_id].add(donation.donor)
    })
  }

  return poolsData.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    totalDonated: parseFloat(p.total_donated) || 0,
    donorCount: donorCountMap[p.id]?.size || 0
  }))
}

// Get pool by ID with accurate contributor count
export async function getPoolById(poolId: string): Promise<Pool | null> {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .eq('id', poolId)
    .single()

  if (error || !data) return null

  // Get unique donor count from pool_donations
  const { data: donations } = await supabase
    .from('pool_donations')
    .select('donor')
    .eq('pool_id', poolId)

  const uniqueDonors = new Set(donations?.map(d => d.donor) || [])

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    totalDonated: parseFloat(data.total_donated) || 0,
    donorCount: uniqueDonors.size
  }
}

// Update pool stats after donation (upserts pool row if it doesn't exist)
export async function updatePoolStats(poolId: string, amount: number, poolName?: string) {
  const pool = await getPoolById(poolId)

  if (pool) {
    // Pool exists — update total
    await supabase
      .from('pools')
      .update({ total_donated: pool.totalDonated + amount })
      .eq('id', poolId)
  } else {
    // Pool row doesn't exist in Supabase yet — create it
    const { VERIFIED_CHARITIES, POOL_META } = await import('@/lib/constants')
    const charity = VERIFIED_CHARITIES.find(c => c.id === poolId)
    const meta = POOL_META[poolId]
    await supabase
      .from('pools')
      .insert({
        id: poolId,
        name: poolName || charity?.name || poolId,
        description: charity?.description || meta?.description || '',
        total_donated: amount,
      })
  }
}

// Create pool donation
export async function createPoolDonation(donation: Omit<PoolDonation, 'id' | 'timestamp'>): Promise<PoolDonation | null> {
  const id = Date.now().toString()
  const { data, error } = await supabase
    .from('pool_donations')
    .insert({
      id,
      donor: donation.donor,
      pool_id: donation.poolId,
      pool_name: donation.poolName,
      amount: donation.amount,
      signature: donation.signature,
      reward_points_earned: donation.rewardPointsEarned
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating pool donation:', error)
    return null
  }

  return {
    id: data.id,
    donor: data.donor,
    poolId: data.pool_id,
    poolName: data.pool_name,
    amount: parseFloat(data.amount),
    signature: data.signature,
    timestamp: data.timestamp,
    rewardPointsEarned: data.reward_points_earned
  }
}

// Get all pool donations
export async function getAllPoolDonations(): Promise<PoolDonation[]> {
  const { data, error } = await supabase
    .from('pool_donations')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error || !data) return []

  return data.map(d => ({
    id: d.id,
    donor: d.donor,
    poolId: d.pool_id,
    poolName: d.pool_name,
    amount: parseFloat(d.amount),
    signature: d.signature,
    timestamp: d.timestamp,
    rewardPointsEarned: d.reward_points_earned
  }))
}
