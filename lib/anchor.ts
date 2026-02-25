import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorWallet } from '@solana/wallet-adapter-react'
import { UMANITY_DONATIONS_PROGRAM_ID, UMANITY_TIPS_PROGRAM_ID } from './constants'

import donationsIdl from './idl/umanity_donations.json'
import tipsIdl from './idl/umanity_tips.json'

export function getProvider(connection: Connection, wallet: AnchorWallet) {
  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  })
}

export function getDonationsProgram(connection: Connection, wallet: AnchorWallet) {
  const provider = getProvider(connection, wallet)
  return new Program(donationsIdl as any, provider)
}

export function getTipsProgram(connection: Connection, wallet: AnchorWallet) {
  const provider = getProvider(connection, wallet)
  return new Program(tipsIdl as any, provider)
}

export function findPoolPDA(poolName: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), Buffer.from(poolName)],
    new PublicKey(UMANITY_DONATIONS_PROGRAM_ID)
  )
}

export function findVaultPDA(poolPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), poolPubkey.toBuffer()],
    new PublicKey(UMANITY_DONATIONS_PROGRAM_ID)
  )
}

export function findUserProfilePDA(ownerPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user'), ownerPubkey.toBuffer()],
    new PublicKey(UMANITY_TIPS_PROGRAM_ID)
  )
}

export function findCampaignPDA(poolPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('campaign'), poolPubkey.toBuffer()],
    new PublicKey(UMANITY_DONATIONS_PROGRAM_ID)
  )
}

export function findMilestonePDA(campaignPubkey: PublicKey, index: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('milestone'), campaignPubkey.toBuffer(), Buffer.from([index])],
    new PublicKey(UMANITY_DONATIONS_PROGRAM_ID)
  )
}
