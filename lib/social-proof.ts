import { supabase } from './supabase'
import { getFollowing } from './tapestry'

export interface SocialProofResult {
  matchedUsernames: string[]
  totalMatched: number
  totalDonors: number
}

export async function getSocialProofForPool(
  currentUsername: string,
  poolId: string
): Promise<SocialProofResult> {
  const empty: SocialProofResult = { matchedUsernames: [], totalMatched: 0, totalDonors: 0 }

  try {
    // Get who the current user follows from Tapestry
    const following = await getFollowing(currentUsername)
    const followingSet = new Set(
      (following || []).map((p: { username?: string }) => p.username?.toLowerCase()).filter(Boolean)
    )

    if (followingSet.size === 0) return empty

    // Get all donors to this pool from Supabase
    const { data: donations } = await supabase
      .from('pool_donations')
      .select('donor')
      .eq('pool_id', poolId)

    if (!donations || donations.length === 0) return empty

    // Get unique donor addresses
    const donorAddresses = [...new Set(donations.map(d => d.donor))]

    // Look up usernames for these addresses
    const { data: users } = await supabase
      .from('users')
      .select('username')
      .in('address', donorAddresses)

    if (!users) return empty

    // Cross-reference with following set
    const matchedUsernames = users
      .map(u => u.username)
      .filter(u => followingSet.has(u?.toLowerCase()))

    return {
      matchedUsernames,
      totalMatched: matchedUsernames.length,
      totalDonors: donorAddresses.length,
    }
  } catch {
    return empty
  }
}
