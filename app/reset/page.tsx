'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPage() {
  const [mode, setMode] = useState<'email' | 'sent' | 'password' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('') // NEW
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function check() {
      // Supabase automatically logs the user in if they clicked a valid email link
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setMode('password')
    }
    check()
  }, [])

  async function sendReset() {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    })
    // Always show the success message to prevent "email enumeration" attacks
    setMode('sent')
    setLoading(false)
  }

  async function updatePassword() {
    setLoading(true)
    setMessage('')
    
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      setLoading(false)
      return
    }
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage(error.message)
    } else {
      setMode('done')
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid var(--line)',
    background: 'var(--bg-alt)',
    color: 'var(--text)',
    fontSize: 14,
  } as const

  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <Link href="/" className="logo">
              JIG'S<span className="dot">Wurl</span>D
            </Link>
            <div className="nav-cta">
              <Link href="/login" className="btn btn-ghost">Log in</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap" style={{ maxWidth: 460, margin: '80px auto', padding: '0 20px' }}>
          <div className="eyebrow">Account recovery</div>
          <h1 style={{ marginBottom: 8 }}>Reset password</h1>

          {mode === 'email' && (
            <>
              <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>
                Enter your account email and we'll send you a secure, single-use reset link.
              </p>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}
                onClick={sendReset}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send secure reset link'}
              </button>
            </>
          )}

          {mode === 'sent' && (
            <div className="locked-note" style={{ marginTop: 10 }}>
              📬 Check your inbox! If an account exists for <b>{email}</b>, we've sent a secure link. Click it to set a new password. (Check spam too.)
            </div>
          )}

          {mode === 'password' && (
            <>
              <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>
                Your identity is verified via the secure email token ✅ Choose a new password.
              </p>
              <input
                type="password"
                placeholder="New password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, marginBottom: 12 }}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}
                onClick={updatePassword}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Set new password'}
              </button>
            </>
          )}

          {mode === 'done' && (
            <div className="locked-note" style={{ marginTop: 10 }}>
              🎉 Password updated securely!{' '}
              <Link href="/login" style={{ color: 'var(--yellow)' }}>Log in now</Link>.
            </div>
          )}

          {message && <p style={{ color: 'var(--pink)', marginTop: 12 }}>{message}</p>}
        </div>
      </main>
    </>
  )
}