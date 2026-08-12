'use client'

import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
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

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

const playSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
const pauseSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>

export default function DiscoverPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [message, setMessage] = useState('')

  const [myLikes, setMyLikes] = useState<string[]>([])
  const [myFollows, setMyFollows] = useState<string[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({})

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    loadAll()
    return () => {
      audioRef.current?.pause()
    }
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

  async function logPlay(trackId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('plays').insert({
      track_id: trackId,
      listener_id: session.user.id,
    })
  }

  function stopAll() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)
  }

  function playIdx(idx: number) {
    const track = tracks[idx]
    if (!track) return

    if (currentIdx === idx && audioRef.current) {
      if (playing) {
        audioRef.current.pause()
        setPlaying(false)
      } else {
        audioRef.current.play()
        setPlaying(true)
      }
      return
    }

    stopAll()
    const audio = new Audio(storageUrl('tracks', track.audio_path))
    audioRef.current = audio
    setCurrentIdx(idx)
    setPlaying(true)
    setTime(0)
    setDuration(0)

    audio.ontimeupdate = () => setTime(audio.currentTime)
    audio.onloadedmetadata = () => setDuration(audio.duration || 0)
    audio.onended = () => playIdx((idx + 1) % tracks.length)
    audio.onerror = () => {
      setMessage('Playback failed for this track.')
      setPlaying(false)
    }

    audio
      .play()
      .then(() => logPlay(track.id))
      .catch(() => setMessage('Playback failed.'))
  }

  function seek(e: MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * duration
  }

  const current = currentIdx > -1 ? tracks[currentIdx] : null

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
              <p>Tap any card to stream it. Like tracks and follow artists for real.</p>
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
                    className={'song-card' + (currentIdx === i ? ' playing' : '')}
                    onClick={() => playIdx(i)}
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {current && (
        <div className="now-playing show">
          <div className="wrap np-inner">
            <div className="np-art" style={{ background: FALLBACKS[currentIdx % FALLBACKS.length] }}></div>
            <div className="np-meta">
              <h5>{current.title}</h5>
              <p>{current.artist_name}</p>
            </div>
            <div className="np-controls">
              <button className="np-play" onClick={() => playIdx(currentIdx)} aria-label="Play/Pause">
                {playing ? pauseSvg : playSvg}
              </button>
            </div>
            <div className="np-progress-wrap">
              <span>{fmt(time)}</span>
              <div className="np-progress" onClick={seek}>
                <i style={{ width: duration ? `${(time / duration) * 100}%` : '0%' }}></i>
              </div>
              <span>{fmt(duration)}</span>
            </div>
            <button className="np-close" onClick={() => { stopAll(); setCurrentIdx(-1) }}>
              {'✕'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}s