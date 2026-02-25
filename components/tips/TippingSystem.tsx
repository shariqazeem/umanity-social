'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { getTipsProgram, findUserProfilePDA } from '@/lib/anchor'

interface User {
  address: string
  username: string
  displayName: string
  totalReceived: number
  totalSent: number
  bio?: string
  rewardPoints?: number
}

export function TippingSystem() {
  const wallet = useWallet()
  const { publicKey } = wallet
  const { connection } = useConnection()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [tipAmount, setTipAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [txSignature, setTxSignature] = useState('')
  const [error, setError] = useState('')
  const [optimisticSuccess, setOptimisticSuccess] = useState(false)

  useEffect(() => {
    if (publicKey) {
      checkRegistration()
      fetchUsers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const checkRegistration = async () => {
    if (!publicKey) return
    try {
      const response = await fetch(`/api/register/check?address=${publicKey.toBase58()}`)
      const data = await response.json()
      if (data.user) setCurrentUser(data.user)
    } catch (error) {
      console.error('Error checking registration:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/tips/users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const sendTip = async () => {
    if (!publicKey || !selectedUser || !tipAmount || !wallet.wallet) return
    const solAmount = parseFloat(tipAmount)
    if (solAmount < 0.001) { setError('Minimum 0.001 SOL'); return }

    setLoading(true)
    setTxSignature('')
    setError('')
    setOptimisticSuccess(false)

    try {
      const recipientPubkey = new PublicKey(selectedUser.address)
      const anchorWallet = wallet as any
      const program = getTipsProgram(connection, anchorWallet)

      // Derive UserProfile PDAs
      const [senderProfilePDA] = findUserProfilePDA(publicKey)
      const [recipientProfilePDA] = findUserProfilePDA(recipientPubkey)

      // Ensure sender's on-chain UserProfile exists (lazy creation)
      const senderAccount = await connection.getAccountInfo(senderProfilePDA)
      if (!senderAccount) {
        try {
          await (program.methods as any)
            .registerUser(currentUser?.username || '', currentUser?.displayName || '')
            .accounts({
              userProfile: senderProfilePDA,
              owner: publicKey,
              systemProgram: '11111111111111111111111111111111',
            })
            .rpc()
        } catch (regErr: any) {
          // If account already exists on-chain, ignore
          if (!regErr.message?.includes('already in use')) {
            throw new Error('Failed to create on-chain profile. Please try again.')
          }
        }
      }

      // Check recipient has on-chain profile (required for tips)
      const recipientAccount = await connection.getAccountInfo(recipientProfilePDA)
      if (!recipientAccount) {
        throw new Error(`@${selectedUser.username} doesn't have an on-chain profile yet. They need to send a tip first to create one.`)
      }

      // Create tip record keypair
      const tipRecord = Keypair.generate()
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL)

      // Call Anchor send_tip instruction
      const signature = await (program.methods as any)
        .sendTip(new BN(lamports), message || '')
        .accounts({
          senderProfile: senderProfilePDA,
          recipientProfile: recipientProfilePDA,
          tipRecord: tipRecord.publicKey,
          sender: publicKey,
          recipient: recipientPubkey,
          systemProgram: '11111111111111111111111111111111',
        })
        .signers([tipRecord])
        .rpc()

      setTxSignature(signature)
      setOptimisticSuccess(true)

      // Sync to backend
      try {
        await fetch('/api/tips/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: publicKey.toBase58(),
            recipient: selectedUser.address,
            recipientUsername: selectedUser.username,
            amount: solAmount,
            message,
            signature,
          }),
        })
      } catch (apiError) {
        console.error('Failed to record tip:', apiError)
      }

      setTimeout(() => {
        setSelectedUser(null)
        setTipAmount('')
        setMessage('')
        setTxSignature('')
        setError('')
        setOptimisticSuccess(false)
        fetchUsers()
        checkRegistration()
      }, 3000)
    } catch (error: any) {
      console.error('Tip error:', error)
      setError(error.message || 'Tip failed')
      setTxSignature('')
      setOptimisticSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (!publicKey) return null

  const otherUsers = users.filter(u => u.address !== publicKey.toBase58())

  return (
    <section>
      {/* Your Profile Summary */}
      {currentUser && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#111] flex items-center justify-center">
                <span className="text-base font-semibold text-white">{currentUser.displayName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold">{currentUser.displayName}</p>
                <p className="text-xs text-gray-400">@{currentUser.username}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm font-bold counter">{currentUser.totalReceived.toFixed(3)}</div>
                <div className="text-[10px] text-gray-400">Received</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold counter">{currentUser.totalSent.toFixed(3)}</div>
                <div className="text-[10px] text-gray-400">Sent</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold counter">{currentUser.rewardPoints || 0}</div>
                <div className="text-[10px] text-gray-400">Points</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Community Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Community</h3>
          <p className="text-sm text-gray-400 mt-0.5">Tip members directly (on-chain)</p>
        </div>
        <span className="pill bg-gray-100 text-gray-500">{otherUsers.length} members</span>
      </div>

      {otherUsers.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-gray-400 text-sm">No other members yet.</p>
          <p className="text-gray-300 text-xs mt-1">Be the first to invite someone.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-stagger">
          {otherUsers.map((user) => (
            <div key={user.address} className="card p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-600">{user.displayName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.displayName}</p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                </div>
              </div>
              {user.bio && <p className="text-xs text-gray-400 mb-3 line-clamp-2 flex-1">{user.bio}</p>}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-black/[0.03]">
                <span className="text-xs text-gray-400">{user.totalReceived.toFixed(3)} SOL</span>
                <button onClick={() => setSelectedUser(user)} className="btn-primary py-2 px-5 text-xs">
                  Tip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tip Modal */}
      {selectedUser && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 animate-in">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-600">{selectedUser.displayName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-bold">Tip @{selectedUser.username}</h3>
                  <p className="text-[11px] text-gray-400">{selectedUser.displayName}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedUser(null); setTxSignature(''); setOptimisticSuccess(false) }} className="btn-ghost w-8 h-8 flex items-center justify-center text-lg">&times;</button>
            </div>

            {(txSignature || optimisticSuccess) && (
              <div className="bg-emerald-50 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Tip sent!</p>
                  {txSignature && (
                    <a href={`https://solscan.io/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline">View on Solscan</a>
                  )}
                </div>
              </div>
            )}

            {error && !txSignature && !optimisticSuccess && (
              <p className="text-red-500 text-xs mb-4">{error}</p>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount (SOL)</label>
                <input type="number" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} placeholder="0.01" step="0.01" min="0.001" className="input" />
                <div className="flex gap-2 mt-2">
                  {['0.01', '0.05', '0.1', '0.5'].map((preset) => (
                    <button key={preset} onClick={() => setTipAmount(preset)} className="btn-secondary flex-1 py-2 text-xs">{preset}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional message..." maxLength={280} rows={2} className="input resize-none" />
              </div>
              <button onClick={sendTip} disabled={loading || !tipAmount || parseFloat(tipAmount) < 0.001} className="btn-primary w-full py-3.5 text-sm">
                {loading ? 'Sending...' : `Send ${tipAmount || '0'} SOL`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
