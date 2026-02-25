import { NextRequest, NextResponse } from 'next/server'
import { getUserImpactNFTs, getAllImpactNFTs } from '@/lib/nft'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress') || searchParams.get('address')

    let nfts
    if (walletAddress) {
      nfts = await getUserImpactNFTs(walletAddress)
    } else {
      nfts = await getAllImpactNFTs()
    }

    return NextResponse.json({ success: true, nfts: nfts || [] })
  } catch (error: any) {
    console.error('Gallery error:', error)
    return NextResponse.json({ success: true, nfts: [] })
  }
}
