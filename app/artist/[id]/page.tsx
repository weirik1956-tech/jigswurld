'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/app/player-context'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
  lyrics: string | null
  artist_id: string
}

type Profile = {
  id: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  role: string
  is_verified: boolean // <-- Added this!
}

const FALLBACKS = [
  'linear-gradient(135deg,#ff4d6d,#ffc845)',
  'linear-gradient(135deg,#37e6c4,#1b2140)',
  'linear-gradient(135deg,#ffc845,#0e1122)',
  'linear-gradient(135deg,#ff4d6d,#37e6c4)',
]

function storageUrl(bucket: string, path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

export default function ArtistProfilePage() {
  const params = useParams<{ id: string }>()
  const artistId = params.id
  const player = usePlayer()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(false)
  const [myLikes, setMyLikes] = useState<string[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!artistId) return
    loadAll()
  }, [artistId])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, bio, avatar_url, role, is_verified') // <-- Added is_verified here
        .eq('id', artistId)
        .maybeSingle()
      setProfile((prof as Profile) || null)

      const { data: tr, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('artist_id', artistId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      const list = (tr ?? []) as Track[]
      setTracks(list)

      const { data: fol } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('artist_id', artistId)
      setFollowers((fol ?? []).length)

      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user.id
      if (uid) setFollowing((fol ?? []).some((f) => f.follower_id === uid))

      if (list.length > 0) {
        const ids = list.map((t) => t.id)
        const { data: likesData } = await supabase
          .from('likes')
          .select('user_id, track_id')
          .in('track_id', ids)
        const lc: Record<string, number> = {}
        const mine: string[] = []
        for (const l of likesData ?? []) {
          lc[l.track_id] = (lc[l.track_id] || 0) + 1
          if (l.user_id === uid) mine.push(l.track_id)
        }
        setLikeCounts(lc)
        setMyLikes(mine)
      }
    } catch (err: any) {
      setMessage(err.message || 'Could not load this artist.')
    }
    setLoading(false)
  }

  async function toggleFollow() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMessage('Log in to follow artists.')
      return
    }
    const uid = session.user.id
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', uid).eq('artist_id', artistId)
      setFollowing(false)
      setFollowers((f) => Math.max(0, f - 1))
    } else {
      await supabase.from('follows').insert({ follower_id: uid, artist_id: artistId })
      setFollowing(true)
      setFollowers((f) => f + 1)
    }
  }

  async function toggleLike(trackId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMessage('Log in to like tracks.')
      return
    }
    const uid = session.user.id
    if (myLikes.includes(trackId)) {
      await supabase.from('likes').delete().eq('user_id', uid).eq('track_id', trackId)
      setMyLikes(myLikes.filter((x) => x !== trackId))
      setLikeCounts({ ...likeCounts, [trackId]: Math.max(0, (likeCounts[trackId] || 0) - 1) })
    } else {
      await supabase.from('likes').insert({ user_id: uid, track_id: trackId })
      setMyLikes([...myLikes, trackId])
      setLikeCounts({ ...likeCounts, [trackId]: (likeCounts[trackId] || 0) + 1 })
    }
  }

  const initials = profile
    ? profile.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

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
              <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
            </div>
          </nav>
        </div>
      </header>

      <main id="top">
        <section>
          <div className="wrap">
            {loading ? (
              <p style={{ padding: '60px 0' }}>Loading artist...</p>
            ) : !profile ? (
              <div className="locked-note" style={{ marginTop: 60 }}>Artist not found.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', padding: '48px 0 8px' }}>
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: FALLBACKS[0],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 40,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--bg)',
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div className="eyebrow">
                      {profile.role === 'admin' ? 'Verified platform account' : 'Independent artist'}
                    </div>
                    
                    {/* FIXED: Changed artistName to profile.full_name */}
                    <h1 style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {profile.full_name}
                      {profile.is_verified && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1d9bf0" title="Verified Artist">
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                        </svg>
                      )}
                    </h1>

                    <p style={{ color: 'var(--text-dim)', maxWidth: 560 }}>
                      {profile.bio || "This artist hasn't written a bio yet — but the music speaks first."}
                    </p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className={following ? 'btn btn-primary' : 'btn btn-ghost'}
                        onClick={toggleFollow}
                      >
                        {following ? 'Following ✓' : '+ Follow'} · {followers}
                      </button>
                      <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                        {tracks.length} release{tracks.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                {message && <p style={{ color: 'var(--pink)', margin: '12px 0' }}>{message}</p>}

                <div className="section-head" style={{ marginTop: 32 }}>
                  <div className="eyebrow">Music</div>
                  <h2>Tracks by {profile.full_name}</h2>
                </div>

                {tracks.length === 0 ? (
                  <div className="locked-note">No published tracks yet.</div>
                ) : (
                  <div className="discovery-grid">
                    {tracks.map((t, i) => (
                      <div
                        key={t.id}
                        className={'song-card' + (player.current?.id === t.id ? ' playing' : '')}
                        onClick={() => player.playTrack(t, tracks)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="cover" style={{ background: FALLBACKS[i % FALLBACKS.length] }}>
                          {t.cover_path && (
                            <img
                              src={storageUrl('covers', t.cover_path)}
                              alt={t.title}
                              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                          <div className="play-overlay">
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="#f5f1e8">
                              <circle cx="12" cy="12" r="11" fill="rgba(11,14,26,0.55)" />
                              <path d="M10 8l6 4-6 4z" fill="#f5f1e8" />
                            </svg>
                          </div>
                        </div>
                        <div className="info">
                          <h5>{t.title}</h5>
                          <p>{profile.full_name}</p>
                          <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className={myLikes.includes(t.id) ? 'active' : ''}
                              onClick={() => toggleLike(t.id)}
                            >
                              ♥ {likeCounts[t.id] || 0}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </>
  )
}