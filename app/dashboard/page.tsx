'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function storageUrl(bucket: string, path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

type TrackStat = {
  id: string
  title: string
  cover_path: string | null
  genre: string | null
  lyrics: string | null
  lyrics_sync: string | null
  plays: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ plays: 0, likes: 0, followers: 0, tracks: 0 })
  const [topTracks, setTopTracks] = useState<TrackStat[]>([])
  
  // Modal States
  const [deleteTarget, setDeleteTarget] = useState<TrackStat | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [editTrackTarget, setEditTrackTarget] = useState<TrackStat | null>(null)
  const [editTrackTitle, setEditTrackTitle] = useState('')
  const [editTrackGenre, setEditTrackGenre] = useState('')
  const [editTrackLyrics, setEditTrackLyrics] = useState('')
  const [editTrackLyricsSync, setEditTrackLyricsSync] = useState('')
  const [isSavingTrack, setIsSavingTrack] = useState(false)

  useEffect(() => { checkAuthAndLoad() }, [])

  async function checkAuthAndLoad() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?mode=login'); return }

    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      if (!prof) throw new Error('Profile not found')
      setProfile(prof)

      const { data: tracks } = await supabase.from('tracks').select('id, title, cover_path, genre, lyrics, lyrics_sync').eq('artist_id', session.user.id)
      const trackList = tracks || []
      const trackIds = trackList.map(t => t.id)

      const { count: totalPlays } = await supabase.from('plays').select('*', { count: 'exact', head: true }).in('track_id', trackIds)
      const { count: totalLikes } = await supabase.from('likes').select('*', { count: 'exact', head: true }).in('track_id', trackIds)
      const { count: totalFollowers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('artist_id', session.user.id)

      setStats({ plays: totalPlays || 0, likes: totalLikes || 0, followers: totalFollowers || 0, tracks: trackList.length })

      if (trackIds.length > 0) {
        const { data: playData } = await supabase.from('plays').select('track_id').in('track_id', trackIds)
        const playCounts: Record<string, number> = {}
        playData?.forEach((p: any) => { playCounts[p.track_id] = (playCounts[p.track_id] || 0) + 1 })
        const ranked = trackList.map(t => ({ ...t, plays: playCounts[t.id] || 0 })).sort((a, b) => b.plays - a.plays)
        setTopTracks(ranked)
      }
    } catch (err: any) { console.error('Dashboard error:', err) } 
    finally { setLoading(false) }
  }

  async function handleConfirmDelete() {
    if (confirmText !== 'DELETE' || !deleteTarget) return
    setIsDeleting(true)
    const { error } = await supabase.from('tracks').delete().eq('id', deleteTarget.id)
    if (!error) {
      setTopTracks(topTracks.filter(t => t.id !== deleteTarget.id))
      setStats(prev => ({ ...prev, tracks: prev.tracks - 1 }))
      setDeleteTarget(null); setConfirmText('')
    } else { alert('Failed to delete track.') }
    setIsDeleting(false)
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('profiles').update({ full_name: editName, bio: editBio }).eq('id', session.user.id)
    if (!error) {
      setProfile({ ...profile, full_name: editName, bio: editBio })
      setEditProfileOpen(false)
    } else { alert('Failed to update profile.') }
    setIsSavingProfile(false)
  }

  async function handleSaveTrack() {
    if (!editTrackTarget) return
    setIsSavingTrack(true)
    const { error } = await supabase.from('tracks').update({
      title: editTrackTitle,
      genre: editTrackGenre,
      lyrics: editTrackLyrics || null,
      lyrics_sync: editTrackLyricsSync || null
    }).eq('id', editTrackTarget.id)
    
    if (!error) {
      setTopTracks(topTracks.map(t => t.id === editTrackTarget.id ? { ...t, title: editTrackTitle, genre: editTrackGenre, lyrics: editTrackLyrics, lyrics_sync: editTrackLyricsSync } : t))
      setEditTrackTarget(null)
    } else { alert('Failed to update track.') }
    setIsSavingTrack(false)
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>Loading dashboard...</div>

  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <Link href="/" className="logo">JIG'S<span className="dot">Wurl</span>D</Link>
            <div className="nav-cta">
              <Link href="/discover" className="btn btn-ghost">Discover</Link>
              <Link href="/library" className="btn btn-ghost">Library</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap" style={{ padding: '50px 28px 140px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 40 }}>
            <div>
              <div className="eyebrow">Artist Dashboard</div>
              <h1 style={{ marginBottom: 8 }}>Welcome back, {profile?.full_name || 'Artist'}</h1>
              <p style={{ color: 'var(--text-dim)' }}>Here's how your music is performing on JIG'SWurlD.</p>
            </div>
            <button onClick={() => { setEditName(profile?.full_name || ''); setEditBio(profile?.bio || ''); setEditProfileOpen(true) }} className="btn btn-ghost" style={{ border: '1px solid var(--line)' }}>
              ✏️ Edit Profile
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 48 }}>
            <StatCard label="Total Plays" value={stats.plays.toLocaleString()} icon="▶" color="var(--yellow)" />
            <StatCard label="Total Likes" value={stats.likes.toLocaleString()} icon="♥" color="var(--pink)" />
            <StatCard label="Followers" value={stats.followers.toLocaleString()} icon="👥" color="var(--mint)" />
            <StatCard label="Tracks Uploaded" value={stats.tracks} icon="🎵" color="var(--text)" />
          </div>

          <section>
            <h2 style={{ fontSize: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>🛠️ Manage Your Music</h2>
            {stats.tracks === 0 ? (
              <div style={{ padding: 40, border: '1px dashed var(--line)', borderRadius: 12, textAlign: 'center', background: 'var(--bg-alt)' }}>
                <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>You haven't uploaded any music yet.</p>
                <Link href="/upload" className="btn btn-primary">Upload Your First Track</Link>
              </div>
            ) : topTracks.length === 0 ? (
              <div style={{ padding: 30, border: '1px solid var(--line)', borderRadius: 12, textAlign: 'center', color: 'var(--text-dim)' }}>Your tracks are live! Plays will appear here soon.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topTracks.map((track, index) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12, background: 'var(--bg-alt)', border: '1px solid var(--line)' }}>
                    <div style={{ width: 30, color: 'var(--text-dim)', fontWeight: 700, fontSize: 16 }}>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</div>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: 'linear-gradient(135deg, #ff4d6d, #ffc845)', overflow: 'hidden', flexShrink: 0 }}>
                      {track.cover_path && <img src={storageUrl('covers', track.cover_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{track.plays} plays · {track.genre || 'Other'}</div>
                    </div>
                    <button onClick={() => { setEditTrackTarget(track); setEditTrackTitle(track.title); setEditTrackGenre(track.genre || 'Other'); setEditTrackLyrics(track.lyrics || ''); setEditTrackLyricsSync(track.lyrics_sync || '') }} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, padding: '8px' }} aria-label="Edit track">✏️</button>
                    <button onClick={() => setDeleteTarget(track)} style={{ background: 'transparent', border: 'none', color: 'var(--pink)', cursor: 'pointer', fontSize: 20, padding: '8px' }} aria-label="Delete track">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Delete Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%' }}>
            <h3 style={{ marginBottom: 12, color: 'var(--pink)' }}>Delete Track?</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: 20, fontSize: 14, lineHeight: 1.5 }}>This will permanently remove <strong>"{deleteTarget.title}"</strong>. This cannot be undone.</p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Type <strong>DELETE</strong> to confirm:</p>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-alt)', color: 'var(--text)', marginBottom: 20, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeleteTarget(null); setConfirmText('') }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmDelete} disabled={confirmText !== 'DELETE' || isDeleting} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: confirmText === 'DELETE' ? 'var(--pink)' : 'var(--line)', color: confirmText === 'DELETE' ? '#fff' : 'var(--text-dim)', cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed', fontWeight: 600 }}>{isDeleting ? 'Deleting...' : 'Delete Track'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 16, padding: 32, maxWidth: 450, width: '100%' }}>
            <h3 style={{ marginBottom: 20 }}>Edit Profile</h3>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Artist Name</span>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-alt)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 24 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Bio</span>
              <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={4} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-alt)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditProfileOpen(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveProfile} disabled={isSavingProfile} className="btn btn-primary">{isSavingProfile ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Track Modal */}
      {editTrackTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 16, padding: 32, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: 20 }}>Edit Track: {editTrackTarget.title}</h3>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Track Title</span>
              <input type="text" value={editTrackTitle} onChange={(e) => setEditTrackTitle(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-alt)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Genre</span>
              <select value={editTrackGenre} onChange={(e) => setEditTrackGenre(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-alt)', color: 'var(--text)', boxSizing: 'border-box' }}>
                <option value="Hip-Hop">Hip-Hop</option>
                <option value="R&B">R&B</option>
                <option value="Afrobeats">Afrobeats</option>
                <option value="Gospel">Gospel</option>
                <option value="Pop">Pop</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Lyrics</span>
              <textarea value={editTrackLyrics} onChange={(e) => setEditTrackLyrics(e.target.value)} rows={4} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-alt)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 24 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Synced Lyrics (Optional)</span>
              <textarea value={editTrackLyricsSync} onChange={(e) => setEditTrackLyricsSync(e.target.value)} rows={4} placeholder="00:00 Line one&#10;00:05 Line two" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-alt)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </label>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditTrackTarget(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveTrack} disabled={isSavingTrack} className="btn btn-primary">{isSavingTrack ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: string, color: string }) {
  return (
    <div style={{ padding: 24, borderRadius: 16, background: 'var(--bg-alt)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: color, lineHeight: 1 }}>{value}</div>
    </div>
  )
}