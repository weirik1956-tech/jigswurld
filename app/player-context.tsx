'use client'

import { createContext, useContext, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import SyncedLyrics from './synced-lyrics'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
  artist_id: string
  artist_name?: string
   lyrics?: string | null
  lyrics_sync?: string | null
  genre?: string | null
  created_at?: string

}

type PlayerState = {
  current: Track | null
  playing: boolean
  time: number
  duration: number
  expanded: boolean
  playTrack: (track: Track, queue?: Track[]) => void
  toggle: () => void
  stop: () => void
  seek: (e: MouseEvent<HTMLDivElement>) => void
  next: () => void
  prev: () => void
  openFull: () => void
  closeFull: () => void
}

const PlayerContext = createContext<PlayerState | null>(null)

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider')
  return ctx
}

function storageUrl(bucket: string, path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function releaseDate(iso?: string) {
  if (!iso) return 'Independent release'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const playSvg = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const pauseSvg = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
  </svg>
)

const playBig = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const pauseBig = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
  </svg>
)

const prevSvg = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 6l-8 6 8 6V6zM6 6h2v12H6z" />
  </svg>
)

const nextSvg = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6l8 6-8 6V6zm10 0h2v12h-2z" />
  </svg>
)

const chevronDown = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
  </svg>
)

const ghostBtn = {
  background: 'none',
  border: 'none',
  color: 'var(--text)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 6,
} as const

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [tipNote, setTipNote] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const queueRef = useRef<Track[]>([])

  async function logPlay(trackId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('plays').insert({
      track_id: trackId,
      listener_id: session.user.id,
    })
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)
    setCurrent(null)
    setExpanded(false)
  }

  function playTrack(track: Track, queue?: Track[]) {
    if (queue) queueRef.current = queue

    if (current?.id === track.id && audioRef.current) {
      if (playing) {
        audioRef.current.pause()
        setPlaying(false)
      } else {
        audioRef.current.play()
        setPlaying(true)
      }
      return
    }

    if (audioRef.current) audioRef.current.pause()

    const audio = new Audio(storageUrl('tracks', track.audio_path))
    audioRef.current = audio
    setCurrent(track)
    setPlaying(true)
    setTime(0)
    setDuration(0)

    audio.ontimeupdate = () => setTime(audio.currentTime)
    audio.onloadedmetadata = () => setDuration(audio.duration || 0)
    audio.onended = () => {
      const q = queueRef.current
      const idx = q.findIndex((t) => t.id === track.id)
      if (q.length > 0 && idx > -1) playTrack(q[(idx + 1) % q.length])
    }
    audio.onerror = () => setPlaying(false)

    audio
      .play()
      .then(() => logPlay(track.id))
      .catch(() => setPlaying(false))
  }

  function toggle() {
    if (current) playTrack(current)
  }

  function next() {
    const q = queueRef.current
    if (!current || q.length === 0) return
    const idx = q.findIndex((t) => t.id === current.id)
    if (idx > -1) playTrack(q[(idx + 1) % q.length])
  }

  function prev() {
    const q = queueRef.current
    if (!current) return
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }
    if (q.length === 0) return
    const idx = q.findIndex((t) => t.id === current.id)
    if (idx > -1) playTrack(q[(idx - 1 + q.length) % q.length])
  }

    function seek(e: MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * duration
  }
  // ↑ seek ends here

  function seekTo(t: number) {
    if (!audioRef.current) return
    audioRef.current.currentTime = t
    if (!playing) {
      audioRef.current.play()
      setPlaying(true)
    }
  }
  // ↑ paste it right here

  async function shareCurrent() {
    // ... existing code continues
  async function shareCurrent() {
    if (!current) return
    const url = `https://jigswurld-xw5l.vercel.app/discover?track=${current.id}`
    const text = `🎧 "${current.title}" by ${current.artist_name} on JIG'SWurlD`
    if (navigator.share) {
      try {
        await navigator.share({ title: "JIG'SWurlD", text, url })
        return
      } catch {
        // closed share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
    } catch {
      // ignore
    }
  }

  return (
    <PlayerContext.Provider
      value={{
        current,
        playing,
        time,
        duration,
        expanded,
        playTrack,
        toggle,
        stop,
        seek,
        next,
        prev,
        openFull: () => setExpanded(true),
        closeFull: () => setExpanded(false),
      }}
    >
      {children}

      {/* ===== MINI PLAYER (bar) ===== */}
      {current && !expanded && (
        <div className="now-playing show">
          <div className="wrap np-inner">
            <div
              className="np-art"
              onClick={() => setExpanded(true)}
              style={{
                background: 'linear-gradient(135deg,#ff4d6d,#ffc845)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {current.cover_path && (
                <img
                  src={storageUrl('covers', current.cover_path)}
                  alt={current.title}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            <div
              className="np-meta"
              onClick={() => setExpanded(true)}
              style={{ cursor: 'pointer' }}
            >
              <h5>{current.title}</h5>
              <p>{current.artist_name}</p>
            </div>
            <div className="np-controls">
              <button className="np-play" onClick={toggle} aria-label="Play/Pause">
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
            <button className="np-close" onClick={stop}>{'✕'}</button>
          </div>
        </div>
      )}

      {/* ===== FULL NOW PLAYING PAGE ===== */}
      {current && expanded && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg)',
            zIndex: 200,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
            <button onClick={() => setExpanded(false)} aria-label="Close" style={ghostBtn}>
              {chevronDown}
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--mint)' }}>
                Now Playing
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{current.genre || 'Other'}</div>
            </div>
            <button onClick={shareCurrent} aria-label="Share" style={ghostBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h5v2H7v10h10v-3h2v5H5V5z" />
              </svg>
            </button>
          </div>

          <div style={{ padding: '8px 28px' }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: 18,
                background: 'linear-gradient(135deg,#ff4d6d,#ffc845)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,.5)',
              }}
            >
              {current.cover_path && (
                <img
                  src={storageUrl('covers', current.cover_path)}
                  alt={current.title}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
          </div>

          <div style={{ padding: '18px 28px 0' }}>
            <h2 style={{ marginBottom: 4, fontSize: 24 }}>{current.title}</h2>
            <p style={{ color: 'var(--text-dim)' }}>{current.artist_name}</p>
          </div>

          <div style={{ padding: '14px 28px 0' }}>
            <div className="np-progress" onClick={seek} style={{ height: 6 }}>
              <i style={{ width: duration ? `${(time / duration) * 100}%` : '0%' }}></i>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
              <span>{fmt(time)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '14px 0' }}>
            <button onClick={prev} aria-label="Previous" style={ghostBtn}>{prevSvg}</button>
            <button
              onClick={toggle}
              aria-label="Play/Pause"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--yellow)',
                color: 'var(--bg)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {playing ? pauseBig : playBig}
            </button>
            <button onClick={next} aria-label="Next" style={ghostBtn}>{nextSvg}</button>
          </div>

          <div style={{ padding: '6px 28px' }}>
            <div style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14, background: 'var(--bg-alt)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Support the artist</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['$1', '$5', '$10'].map((v) => (
                  <button
                    key={v}
                    onClick={() =>
                      setTipNote('💸 Real card tipping lands in the next update — Stripe is being wired right now!')
                    }
                    style={{
                      padding: '8px 18px',
                      borderRadius: 999,
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      color: 'var(--yellow)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Tip {v}
                  </button>
                ))}
              </div>
              {tipNote && <p style={{ fontSize: 12, color: 'var(--mint)', marginTop: 8 }}>{tipNote}</p>}
            </div>
          </div>

         
          <div style={{ padding: '0 28px 60px', fontSize: 12, color: 'var(--text-dim)' }}>
            About this track — Genre: {current.genre || 'Other'} · Released: {releaseDate(current.created_at)} · Artist: {current.artist_name}
          </div>
        </div>
      )}
    </PlayerContext.Provider>
  )
}
}