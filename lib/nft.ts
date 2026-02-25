import { supabase } from './supabase'

export interface ImpactNFT {
  id: string
  owner_address: string
  donation_id?: string
  cause_name: string
  amount: number
  tier: 'bronze' | 'silver' | 'gold' | 'diamond'
  mint_signature?: string
  metadata_uri?: string
  created_at: string
}

export function getTier(amount: number): 'bronze' | 'silver' | 'gold' | 'diamond' {
  if (amount >= 1.0) return 'diamond'
  if (amount >= 0.5) return 'gold'
  if (amount >= 0.1) return 'silver'
  return 'bronze'
}

export function getTierConfig(tier: string) {
  const tiers: Record<string, { label: string; color: string; bgColor: string; borderColor: string; emoji: string }> = {
    bronze: { label: 'Bronze', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', emoji: '🥉' },
    silver: { label: 'Silver', color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-300', emoji: '🥈' },
    gold: { label: 'Gold', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', emoji: '🥇' },
    diamond: { label: 'Diamond', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', emoji: '💎' },
  }
  return tiers[tier] || tiers.bronze
}

export function buildNFTMetadata(cause: string, amount: number, tier: string, donor: string) {
  return {
    name: `Umanity Impact: ${cause}`,
    symbol: 'UMANITY',
    description: `Proof of impact. ${amount} SOL donated to ${cause} via Umanity — The Social Impact Network on Solana.`,
    image: '', // Would be generated/hosted image
    attributes: [
      { trait_type: 'Cause', value: cause },
      { trait_type: 'Amount', value: `${amount} SOL` },
      { trait_type: 'Tier', value: tier.charAt(0).toUpperCase() + tier.slice(1) },
      { trait_type: 'Donor', value: donor },
      { trait_type: 'Platform', value: 'Umanity' },
      { trait_type: 'Soulbound', value: 'true' },
    ],
    properties: {
      category: 'impact-certificate',
      creators: [{ address: donor, share: 100 }],
    },
  }
}

export async function recordImpactNFT(
  ownerAddress: string,
  causeName: string,
  amount: number,
  donationId?: string,
  mintSignature?: string
) {
  const tier = getTier(amount)

  const { data, error } = await supabase
    .from('impact_nfts')
    .insert({
      owner_address: ownerAddress,
      donation_id: donationId,
      cause_name: causeName,
      amount,
      tier,
      mint_signature: mintSignature || null,
      metadata_uri: null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserImpactNFTs(walletAddress: string) {
  const { data, error } = await supabase
    .from('impact_nfts')
    .select('*')
    .eq('owner_address', walletAddress)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAllImpactNFTs() {
  const { data, error } = await supabase
    .from('impact_nfts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}
