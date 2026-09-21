'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/app/player-context'
import SyncedLyrics from '@/app/synced-lyrics'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
  lyrics: string | null
  lyrics_sync: string | null
  genre: string | null
  created_at: string | null
  artist_id: string
}

function storageUrl(bucket: string, path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

function fmtDate(iso?: string | null) {
  if (!iso) return 'Independent release'
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function TrackPage() {
  const params = useParams<{ id: string }>()
  const trackId = params.id
  const player = usePlayer()

  const [track, setTrack] = useState<Track | null>(null)
  const [artistName, setArtistName] = useState('')
  const [isVerified, setIsVerified] = useState(false) // <-- ADDED STATE FOR VERIFICATION
  const [plays, setPlays] = useState(0)
  const [likes, setLikes] = useState(0)
  const [liked, setLiked] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trackId) return
    load()
  }, [trackId])

  async function load() {
    setLoading(true)
    try {
      const { data: t, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .maybeSingle()
      if (error) throw error
      if (!t) {
        setLoading(false)
        return
      }
      const tr = t as Track
      setTrack(tr)

      // <-- UPDATED: Select is_verified and save it to state
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, is_verified')
        .eq('id', tr.artist_id)
        .maybeSingle()
      
      setArtistName(prof?.full_name || 'Unknown Artist')
      setIsVerified(!!prof?.is_verified)

      const { count: pc } = await supabase
        .from('plays')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId)
      setPlays(pc || 0)

      const { count: lc } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId)
      setLikes(lc || 0)

      const { count: fc } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', tr.artist_id)
      setFollowers(fc || 0)

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: myLike } = await supabase
          .from('likes')
          .select('user_id')
          .eq('user_id', session.user.id)
          .eq('track_id', trackId)
          .maybeSingle()
        setLiked(!!myLike)

        const { data: myFol } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', session.user.id)
          .eq('artist_id', tr.artist_id)
          .maybeSingle()
        setFollowing(!!myFol)
      }
    } catch (err: any) {
      setMessage(err.message || 'Could not load this track.')
    }
    setLoading(false)
  }

  async function toggleLike() {
    if (!track) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMessage('Log in to like tracks.')
      return
    }
    const uid = session.user.id
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', uid).eq('track_id', track.id)
      setLiked(false)
      setLikes((n) => Math.max(0, n - 1))
    } else {
      await supabase.from('likes').insert({ user_id: uid, track_id: track.id })
      setLiked(true)
      setLikes((n) => n + 1)
    }
  }

  async function toggleFollow() {
    if (!track) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMessage('Log in to follow artists.')
      return
    }
    const uid = session.user.id
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', uid).eq('artist_id', track.artist_id)
      setFollowing(false)
      setFollowers((n) => Math.max(0, n - 1))
    } else {
      await supabase.from('follows').insert({ follower_id: uid, artist_id: track.artist_id })
      setFollowing(true)
      setFollowers((n) => n + 1)
    }
  }

  async function share() {
    if (!track) return
    const url = `https://jigswurld-xw5l.vercel.app/track/${track.id}`
    const text = `🎧 "${track.title}" by ${artistName} on JIG'SWurlD`
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
      setMessage('Link copied — share it anywhere!')
    } catch {
      setMessage(url)
    }
  }

  function handleSeekLine(t: number) {
    if (!track) return
    if (player.current?.id === track.id) {
      player.seekTo(t)
    } else {
      const playerTrack = { ...track, created_at: track.created_at ?? undefined }
      player.playTrack(playerTrack, [playerTrack])
      setTimeout(() => player.seekTo(t), 500)
    }
  }

  const isCurrent = player.current?.id === trackId

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

      <main>
        <div className="wrap" style={{ padding: '40px 28px 140px' }}>
          {loading ? (
            <p>Loading track...</p>
          ) : !track ? (
            <div className="locked-note">Track not found.</div>
          ) : (
            <>
              <Link href="/discover" style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                {'←'} Back to Discover
              </Link>

              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 20, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 240,
                    height: 240,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg,#ff4d6d,#ffc845)',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 16px 50px rgba(0,0,0,.45)',
                  }}
                >
                  {track.cover_path && (
                    <img
                      src={storageUrl('covers', track.cover_path)}
                      alt={track.title}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 260 }}>
                  <div className="eyebrow">{track.genre || 'Other'}</div>
                  <h1 style={{ marginBottom: 6 }}>{track.title}</h1>
                  
                  {/* <-- UPDATED: Now uses the isVerified state variable safely */}
                  <p style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Link href={'/artist/' + track.artist_id} style={{ color: 'var(--text-dim)' }}>
                      {artistName}
                    </Link>
                    {isVerified && (
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="#1d9bf0" aria-label="Verified Artist">
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                      </svg>
                    )}
                  </p>

                  <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 18 }}>
                    {plays} plays · {likes} likes · {fmtDate(track.created_at)}
                  </p>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        if (isCurrent) {
                          player.toggle()
                          return
                        }
                        const playableTrack = { ...track, created_at: track.created_at ?? undefined }
                        player.playTrack(playableTrack, [playableTrack])
                      }}
                    >
                      {isCurrent && player.playing ? 'Pause' : 'Play'}
                    </button>
                    <button className={liked ? 'btn btn-primary' : 'btn btn-ghost'} onClick={toggleLike}>
                      {'♥'} {liked ? 'Liked' : 'Like'} · {likes}
                    </button>
                    <button className={following ? 'btn btn-primary' : 'btn btn-ghost'} onClick={toggleFollow}>
                      {following ? 'Following' : '+ Follow'} · {followers}
                    </button>
                    <button className="btn btn-ghost" onClick={share}>Share</button>
                  </div>

                  {message && <p style={{ color: 'var(--pink)', marginTop: 12 }}>{message}</p>}
                </div>
              </div>

              {track.lyrics_sync ? (
                <div style={{ marginTop: 36, maxWidth: 640 }}>
                  <div className="eyebrow">Synchronized lyrics</div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 10 }}>
                    Tap any line to jump the song to that moment.
                  </p>
                  <SyncedLyrics
                    raw={track.lyrics_sync}
                    time={isCurrent ? player.time : 0}
                    onSeek={handleSeekLine}
                  />
                </div>
              ) : track.lyrics ? (
                <div style={{ marginTop: 36, maxWidth: 640 }}>
                  <div className="eyebrow">Lyrics</div>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      marginTop: 10,
                      fontSize: 13.5,
                      lineHeight: 1.7,
                      color: 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {track.lyrics}
                  </pre>
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 36,
                  maxWidth: 640,
                  border: '1px solid var(--line)',
                  borderRadius: 14,
                  padding: 16,
                  background: 'var(--bg-alt)',
                  fontSize: 13,
                  color: 'var(--text-dim)',
                }}
              >
                About this track — Genre: {track.genre || 'Other'} · Released: {fmtDate(track.created_at)} · Artist:{' '}
                <Link href={'/artist/' + track.artist_id} style={{ color: 'var(--yellow)' }}>
                  {artistName}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}