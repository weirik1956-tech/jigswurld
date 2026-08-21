'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AdminUser = {
  user_id: string
  full_name: string
  email: string
  role: string
  joined: string
}

const COMMISSION_PER_SIGNUP = 0.2

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile?.role !== 'admin') {
        setMessage('Admins only.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('admin_list_users')

      if (error) {
        setMessage(error.message)
      } else {
        setUsers(data as AdminUser[])
      }

      setLoading(false)
    }

    load()
  }, [router])

  const nonAdmin = users.filter((u) => u.role !== 'admin')
  const total = nonAdmin.length * COMMISSION_PER_SIGNUP

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
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
              <button onClick={logout} className="btn btn-ghost">Log out</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="wrap" style={{ padding: '40px 28px' }}>
        <h1 style={{ marginBottom: 8 }}>Admin</h1>

        {message && <p>{message}</p>}
        {loading && <p>Loading...</p>}

        {!loading && !message && (
          <div className="admin-panel" style={{ marginTop: 16 }}>
            <h3><span>Platform commission</span></h3>
            <p className="sub">
              JIG'SWurlD credits the admin account a small commission every time someone registers.
            </p>

            <div className="admin-total">${total.toFixed(2)}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
              $0.20 commission × {nonAdmin.length} registered users
            </div>

            <table className="userlist">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Type</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={4}>No registrations yet.</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="self">{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{new Date(u.joined).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}