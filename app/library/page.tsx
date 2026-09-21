'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Playlist = {
  id: string
  name: string
  description: string | null
  track_count?: number
}

export default function LibraryPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlaylists()
  }, [])

  async function loadPlaylists() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('playlists')
      .select('id, name, description, playlist_tracks(count)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    // Map the count properly
    const mapped = (data || []).map((p: any) => ({
      ...p,
      track_count: p.playlist_tracks?.[0]?.count || 0
    }))
    
    setPlaylists(mapped)
    setLoading(false)
  }

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from('playlists')
      .insert({ user_id: session.user.id, name: newName.trim(), description: newDesc.trim() })

    if (error) {
      setMessage('Error creating playlist.')
    } else {
      setNewName('')
      setNewDesc('')
      setMessage('Playlist created!')
      loadPlaylists() // Refresh list
    }
  }

  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <Link href="/" className="logo">JIG'S<span className="dot">Wurl</span>D</Link>
            <div className="nav-cta">
              <Link href="/discover" className="btn btn-ghost">Discover</Link>
              <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap" style={{ padding: '50px 28px 140px', maxWidth: 800, margin: '0 auto' }}>
          <div className="eyebrow">Your Collection</div>
          <h1 style={{ marginBottom: 24 }}>My Library</h1>

          {/* Create Form */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 24, background: 'var(--bg-alt)', marginBottom: 40 }}>
            <h3 style={{ marginBottom: 16 }}>Create New Playlist</h3>
            <form onSubmit={createPlaylist} style={{ display: 'grid', gap: 12 }}>
              <input
                type="text"
                placeholder="Playlist Name (e.g., Late Night Vibes)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                style={{ padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={{ padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
              />
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>Create Playlist</button>
            </form>
            {message && <p style={{ marginTop: 10, color: 'var(--mint)' }}>{message}</p>}
          </div>

          {/* List */}
          <h3 style={{ marginBottom: 16 }}>Your Playlists</h3>
          {loading ? <p>Loading...</p> : playlists.length === 0 ? (
            <p style={{ color: 'var(--text-dim)' }}>You haven't created any playlists yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
              {playlists.map((p) => (
                <Link key={p.id} href={`/playlist/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: 'var(--bg-alt)', transition: 'transform 0.2s' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #37e6c4, #1b2140)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>
                    <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{p.track_count} tracks</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}