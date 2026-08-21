'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--bg-alt)',
  color: 'var(--text)',
  fontSize: 14,
}

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'artist' | 'listener'>('artist')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const m = params.get('mode')
    if (m === 'login') setMode('login')
    if (m === 'signup') setMode('signup')
  }, [])

  async function routeAfterAuth(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    router.push(data?.role === 'admin' ? '/admin' : '/dashboard')
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } },
        })

        if (error) throw error

        if (data.session && data.user) {
          await routeAfterAuth(data.user.id)
        } else {
          setMessage('Account created. Check your email to confirm, then log in.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        await routeAfterAuth(data.user.id)
      }
    } catch (err: any) {
      setMessage(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <Link href="/" className="logo">
              JIG'S<span className="dot">Wurl</span>D
            </Link>
            <div className="nav-cta">
              <Link href="/discover" className="btn btn-ghost">Discover</Link>
            </div>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 460, margin: '60px auto', padding: '0 24px' }}>
        <div className="eyebrow">
          {mode === 'login' ? 'Welcome back' : 'Now boarding independent artists'}
        </div>
        <h1 style={{ marginBottom: 6 }}>
          {mode === 'login' ? 'Log in' : 'Create account'}
        </h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
          {mode === 'login'
            ? 'Pick up where you left off.'
            : 'Keep your masters. Build your audience. Get paid.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={inputStyle}
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'artist' | 'listener')}
                style={inputStyle}
              >
                <option value="artist">I am an Artist</option>
                <option value="listener">I am a Listener</option>
              </select>
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          <button
            disabled={loading}
            className="btn btn-primary"
            style={{ justifyContent: 'center' }}
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        {message && <p style={{ marginTop: 12, color: 'var(--pink)' }}>{message}</p>}

        <div style={{ marginTop: 20 }}>
          {mode === 'login' ? (
            <button className="btn btn-ghost" onClick={() => setMode('signup')}>
              New here? Create an account
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setMode('login')}>
              Already have an account? Log in
            </button>
          )}
        </div>
      </main>
    </>
  )
}
