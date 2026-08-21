'use client'

import { createContext, useContext, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
  artist_id: string
  artist_name?: string
}

type PlayerState = {
  current: Track | null
  playing: boolean
  time: number
  duration: number
  playTrack: (track: Track, queue?: Track[]) => void
  toggle: () => void
  stop: () => void
  seek: (e: MouseEvent<HTMLDivElement>) => void
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

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

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

  function seek(e: MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * duration
  }

  return (
    <PlayerContext.Provider
      value={{ current, playing, time, duration, playTrack, toggle, stop, seek }}
    >
      {children}

      {current && (
        <div className="now-playing show">
          <div className="wrap np-inner">
            <div
              className="np-art"
              style={{ background: 'linear-gradient(135deg,#ff4d6d,#ffc845)' }}
            ></div>
            <div className="np-meta">
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
    </PlayerContext.Provider>
  )
}