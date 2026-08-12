'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'artist' | 'listener'>('artist')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
    <main style={{ maxWidth: 420, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>JIG'SWurlD</h1>
      <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {mode === 'signup' && (
          <>
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ padding: 10 }}
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'artist' | 'listener')}
              style={{ padding: 10 }}
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
          style={{ padding: 10 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{ padding: 10 }}
        />

        <button disabled={loading} style={{ padding: 12 }}>
          {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}

      <div style={{ marginTop: 20 }}>
        {mode === 'login' ? (
          <button onClick={() => setMode('signup')}>
            New here? Create an account
          </button>
        ) : (
          <button onClick={() => setMode('login')}>
            Already have an account? Log in
          </button>
        )}
      </div>
    </main>
  )
}