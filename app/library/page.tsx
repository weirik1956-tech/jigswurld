'use client'

import Header from '../components/Header'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/app/player-context'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
  artist_id: string
  artist_name: string
}

type Playlist = {
  id: string
  name: string
  description: string | null
  track_count: number
}

export default function LibraryPage() {
  const router = useRouter()
  const player = usePlayer()

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [likedTracks, setLikedTracks] = useState<Track[]>([])
  const [recentPlays, setRecentPlays] = useState<Track[]>([])
  
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  async function checkAuthAndLoad() {
    setLoading(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login?mode=login')
      return
    }
    try {
      await Promise.all([
        loadPlaylists(session.user.id),
        loadLikedTracks(session.user.id),
        loadRecentPlays(session.user.id)
      ])
    } catch (err: any) {
      console.error('Library load error:', err)
      setError("Couldn't load your library. Please try refreshing.")
    } finally {
      setLoading(false)
    }
  }

  async function loadPlaylists(userId: string) {
    const { data, error } = await supabase
      .from('playlists')
      .select('id, name, description, playlist_tracks(count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    const mapped = (data || []).map((p: any) => ({
      ...p,
      track_count: p.playlist_tracks?.[0]?.count || 0
    }))
    setPlaylists(mapped)
  }

  async function loadLikedTracks(userId: string) {
    const { data: likes, error } = await supabase.from('likes').select('track_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
    if (error) throw error
    if (!likes || likes.length === 0) { setLikedTracks([]); return }
    const trackIds = likes.map(l => l.track_id)
    const { data: tracks } = await supabase.from('tracks').select('id, title, cover_path, audio_path, artist_id').in('id', trackIds)
    if (!tracks || tracks.length === 0) { setLikedTracks([]); return }
    const artistIds = Array.from(new Set(tracks.map(t => t.artist_id)))
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', artistIds)
    const names = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]))
    setLikedTracks(tracks.map(t => ({ id: t.id, title: t.title, audio_path: t.audio_path, cover_path: t.cover_path, artist_id: t.artist_id, artist_name: names[t.artist_id] || 'Unknown Artist' })))
  }

  async function loadRecentPlays(userId: string) {
    const { data: plays, error } = await supabase.from('plays').select('track_id').eq('listener_id', userId).order('created_at', { ascending: false }).limit(5)
    if (error) throw error
    if (!plays || plays.length === 0) { setRecentPlays([]); return }
    const trackIds = plays.map(p => p.track_id)
    const { data: tracks } = await supabase.from('tracks').select('id, title, cover_path, audio_path, artist_id').in('id', trackIds)
    if (!tracks || tracks.length === 0) { setRecentPlays([]); return }
    const artistIds = Array.from(new Set(tracks.map(t => t.artist_id)))
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', artistIds)
    const names = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]))
    setRecentPlays(tracks.map(t => ({ id: t.id, title: t.title, audio_path: t.audio_path, cover_path: t.cover_path, artist_id: t.artist_id, artist_name: names[t.artist_id] || 'Unknown Artist' })))
  }

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setMessage('')
    const { error } = await supabase.from('playlists').insert({ user_id: session.user.id, name: newName.trim(), description: newDesc.trim() })
    if (error) setMessage(`Error: ${error.message}`)
    else {
      setNewName(''); setNewDesc(''); setMessage('Playlist created!')
      loadPlaylists(session.user.id)
    }
  }

  // NEW: Delete Playlist Function
  async function deletePlaylist(playlistId: string) {
    if (!confirm('Are you sure you want to delete this playlist? This cannot be undone.')) return
    const { error } = await supabase.from('playlists').delete().eq('id', playlistId)
    if (error) {
      setMessage('Failed to delete playlist.')
    } else {
      setMessage('Playlist deleted.')
      const { data: { session } } = await supabase.auth.getSession()
      if (session) loadPlaylists(session.user.id)
    }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}><p>Loading your library...</p></div>
  if (error) return <div style={{ padding: 60, textAlign: 'center' }}><p style={{ color: 'var(--pink)', marginBottom: 16, fontSize: 16 }}>{error}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button></div>

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
        <div className="wrap" style={{ padding: '50px 28px 140px', maxWidth: 900, margin: '0 auto' }}>
          <div className="eyebrow">Your Collection</div>
          <h1 style={{ marginBottom: 32 }}>My Library</h1>
          {message && <p style={{ color: 'var(--mint)', marginBottom: 20, fontWeight: 600 }}>{message}</p>}

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>🕘 Recently Played</h2>
            {recentPlays.length === 0 ? (
              <div style={{ padding: 24, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--bg-alt)', color: 'var(--text-dim)', textAlign: 'center' }}>No recent plays. <Link href="/discover" style={{ color: 'var(--yellow)' }}>Go discover some music!</Link></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentPlays.map((track) => (
                  <div key={track.id} onClick={() => player.playTrack(track, recentPlays)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: 'var(--bg-alt)', cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 6, background: 'linear-gradient(135deg, #ff4d6d, #ffc845)', overflow: 'hidden', flexShrink: 0 }}>
                      {track.cover_path && <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${track.cover_path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--text)' }}>{track.title}</div><div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{track.artist_name}</div></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>❤️ Liked Songs <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 400 }}>({likedTracks.length})</span></h2>
            {likedTracks.length === 0 ? (
              <div style={{ padding: 24, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--bg-alt)', color: 'var(--text-dim)', textAlign: 'center' }}>No liked songs yet. Songs you ❤️ will appear here.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                {likedTracks.map((track) => (
                  <div key={track.id} onClick={() => player.playTrack(track, likedTracks)} style={{ padding: 12, borderRadius: 12, background: 'var(--bg-alt)', cursor: 'pointer', border: '1px solid var(--line)' }}>
                    <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 8, background: 'linear-gradient(135deg, #37e6c4, #1b2140)', marginBottom: 12, overflow: 'hidden' }}>
                      {track.cover_path && <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${track.cover_path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{track.artist_name}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>🎵 Your Playlists</h2>
            <div style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 24, background: 'var(--bg-alt)', marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>Create New Playlist</h3>
              <form onSubmit={createPlaylist} style={{ display: 'grid', gap: 12 }}>
                <input type="text" placeholder="Playlist Name" value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }} />
                <input type="text" placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }} />
                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>Create Playlist</button>
              </form>
            </div>

            {playlists.length === 0 ? (
              <div style={{ padding: 32, border: '1px dashed var(--line)', borderRadius: 12, textAlign: 'center', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>No playlists yet.</p>
                <p style={{ fontSize: 13 }}>Create a playlist above and start building your collection.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                {playlists.map((p) => (
                  <div key={p.id} style={{ position: 'relative', border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: 'var(--bg-alt)' }}>
                    <Link href={`/playlist/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: 'linear-gradient(135deg, #37e6c4, #1b2140)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎵</div>
                      <div style={{ fontWeight: 700, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{p.track_count} tracks</div>
                    </Link>
                    {/* NEW: Delete Playlist Button */}
                    <button 
                      onClick={() => deletePlaylist(p.id)}
                      style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pink)', cursor: 'pointer', fontSize: 14 }}
                      aria-label="Delete playlist"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}