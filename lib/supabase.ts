import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface DbUser {
  address: string
  username: string
  display_name: string
  bio: string
  total_received: number
  total_sent: number
  total_donated: number
  reward_points: number
  tip_count_received: number
  tip_count_sent: number
  donation_count: number
  created_at: string
  is_active: boolean
}

export interface DbDonation {
  id: string
  donor: string
  amount: number
  signature: string
  timestamp: string
  type: string
  reward_points_earned: number
  status: string
}

export interface DbTip {
  id: string
  sender: string
  recipient: string
  recipient_username: string
  amount: number
  message: string
  signature: string
  timestamp: string
  reward_points_earned: number
}

export interface DbPool {
  id: string
  name: string
  description: string
  total_donated: number
  donor_count: number
}

export interface DbPoolDonation {
  id: string
  donor: string
  pool_id: string
  pool_name: string
  amount: number
  signature: string
  timestamp: string
  reward_points_earned: number
}
