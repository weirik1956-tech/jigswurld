'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '../player-context'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
  lyrics: string | null
  artist_id: string
  artist_name?: string
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

export default function DiscoverPage() {
  const player = usePlayer()

  const [tracks, setTracks] = useState<Track[]>([])
  const [message, setMessage] = useState('')
  const [myLikes, setMyLikes] = useState<string[]>([])
  const [myFollows, setMyFollows] = useState<string[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({})
  const [lyricsOpen, setLyricsOpen] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      await loadAll()
      const params = new URLSearchParams(window.location.search)
      const trackParam = params.get('track')
      if (trackParam) {
        setTimeout(() => {
          const el = document.getElementById('track-' + trackParam)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 400)
      }
    }
    run()
  }, [])

  async function loadAll() {
    try {
      const { data: tracksData, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      if (!tracksData || tracksData.length === 0) {
        setTracks([])
        return
      }

      const artistIds = Array.from(new Set(tracksData.map((t) => t.artist_id)))
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', artistIds)

      const names = Object.fromEntries(
        (profilesData ?? []).map((p) => [p.id, p.full_name])
      )

      const list = tracksData.map((t) => ({
        ...t,
        artist_name: names[t.artist_id] || 'Unknown Artist',
      }))
      setTracks(list)

      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user.id

      const trackIds = list.map((t) => t.id)
      const { data: likesData } = await supabase
        .from('likes')
        .select('user_id, track_id')
        .in('track_id', trackIds)

      const lc: Record<string, number> = {}
      const mine: string[] = []
      for (const l of likesData ?? []) {
        lc[l.track_id] = (lc[l.track_id] || 0) + 1
        if (l.user_id === uid) mine.push(l.track_id)
      }
      setLikeCounts(lc)
      setMyLikes(mine)

      const { data: folData } = await supabase
        .from('follows')
        .select('follower_id, artist_id')
        .in('artist_id', artistIds)

      const fc: Record<string, number> = {}
      const myf: string[] = []
      for (const f of folData ?? []) {
        fc[f.artist_id] = (fc[f.artist_id] || 0) + 1
        if (f.follower_id === uid) myf.push(f.artist_id)
      }
      setFollowCounts(fc)
      setMyFollows(myf)
    } catch (err: any) {
      setMessage(err.message || 'Could not load tracks.')
    }
  }

  async function requireSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMessage('Log in to do that.')
      return null
    }
    return session.user.id
  }

  async function toggleLike(trackId: string) {
    const uid = await requireSession()
    if (!uid) return

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

  async function toggleFollow(artistId: string) {
    const uid = await requireSession()
    if (!uid) return

    if (myFollows.includes(artistId)) {
      await supabase.from('follows').delete().eq('follower_id', uid).eq('artist_id', artistId)
      setMyFollows(myFollows.filter((x) => x !== artistId))
      setFollowCounts({ ...followCounts, [artistId]: Math.max(0, (followCounts[artistId] || 0) - 1) })
    } else {
      await supabase.from('follows').insert({ follower_id: uid, artist_id: artistId })
      setMyFollows([...myFollows, artistId])
      setFollowCounts({ ...followCounts, [artistId]: (followCounts[artistId] || 0) + 1 })
    }
  }
    async function shareTrack(t: Track) {
    const url = `https://jigswurld-xw5l.vercel.app/discover?track=${t.id}`
    const text = `🎧 "${t.title}" by ${t.artist_name} on JIG'SWurlD`

    if (navigator.share) {
      try {
        await navigator.share({ title: "JIG'SWurlD", text, url })
        return
      } catch {
        // user closed the share sheet — fall back to copy
      }
    }

    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setMessage('Share link copied — paste it anywhere!')
    } catch {
      setMessage(url)
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
              <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
              <Link href="/upload" className="btn btn-primary">Upload</Link>
            </div>
          </nav>
        </div>
      </header>

      <main id="top">
        <section id="discover">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">Discovery engine</div>
              <h2>New releases, before they blow up.</h2>
              <p>Music keeps playing while you browse the whole site.</p>
            </div>

            {message && <p style={{ color: 'var(--pink)', marginBottom: 16 }}>{message}</p>}

            {tracks.length === 0 ? (
              <div className="locked-note">
                No published tracks yet. Upload one from the{' '}
                <Link href="/upload" style={{ color: 'var(--yellow)' }}>upload page</Link>.
              </div>
            ) : (
              <div className="discovery-grid">
                {tracks.map((t, i) => (
                      <div
                    key={t.id}
                    id={'track-' + t.id}
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
                      <p>{t.artist_name}</p>
                      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={myLikes.includes(t.id) ? 'active' : ''}
                          onClick={() => toggleLike(t.id)}
                        >
                          ♥ {likeCounts[t.id] || 0}
                        </button>
                        <button
                          className={'follow' + (myFollows.includes(t.artist_id) ? ' active' : '')}
                          onClick={() => toggleFollow(t.artist_id)}
                        >
                          {myFollows.includes(t.artist_id) ? 'Following' : 'Follow'} · {followCounts[t.artist_id] || 0}
                        </button>
                        <button onClick={() => setLyricsOpen(lyricsOpen === t.id ? null : t.id)}>
                          {lyricsOpen === t.id ? 'Hide lyrics' : '♪ Lyrics'}
                        </button>
                                                <button onClick={() => shareTrack(t)}>Share</button>
                      </div>
                      {lyricsOpen === t.id && (
                        <pre
                          style={{
                            whiteSpace: 'pre-wrap',
                            marginTop: 10,
                            fontSize: 12.5,
                            lineHeight: 1.6,
                            color: 'var(--text-dim)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {t.lyrics || 'No lyrics uploaded for this track.'}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  )
}