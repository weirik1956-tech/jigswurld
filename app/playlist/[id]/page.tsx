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
  artist_id: string
  artist_name?: string
}

function storageUrl(bucket: string, path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

export default function PlaylistDetailPage() {
  const params = useParams<{ id: string }>()
  const playlistId = params.id
  const player = usePlayer()

  const [playlist, setPlaylist] = useState<any>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playlistId) return
    loadPlaylist()
  }, [playlistId])

  async function loadPlaylist() {
    // 1. Get playlist details
    const { data: plData } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .maybeSingle()

    if (!plData) {
      setLoading(false)
      return
    }
    setPlaylist(plData)

    // 2. Check if current user is the owner
    const { data: { session } } = await supabase.auth.getSession()
    if (session && session.user.id === plData.user_id) {
      setIsOwner(true)
    }

    // 3. Get tracks in this playlist
    const { data: ptData } = await supabase
      .from('playlist_tracks')
      .select('track_id, tracks(*)')
      .eq('playlist_id', playlistId)
      .order('added_at', { ascending: true })

    if (ptData && ptData.length > 0) {
      // Get artist names for all tracks
      const artistIds = Array.from(new Set(ptData.map((pt: any) => pt.tracks.artist_id)))
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', artistIds)
      
      const names = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.full_name]))

      const finalTracks: Track[] = ptData.map((pt: any) => ({
        ...pt.tracks,
        artist_name: names[pt.tracks.artist_id] || 'Unknown Artist',
      }))
      setTracks(finalTracks)
    }

    setLoading(false)
  }

  async function removeTrack(trackId: string) {
    if (!isOwner) return
    await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId)
    
    // Refresh the list
    setTracks(tracks.filter(t => t.id !== trackId))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading playlist...</div>
  if (!playlist) return <div style={{ padding: 40, textAlign: 'center' }}>Playlist not found.</div>

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
              <Link href="/library" className="btn btn-ghost">Library</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap" style={{ padding: '50px 28px 140px', maxWidth: 800, margin: '0 auto' }}>
          {/* Header Section */}
          <div style={{ display: 'flex', gap: 30, alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap' }}>
            <div 
              style={{ 
                width: 240, 
                height: 240, 
                borderRadius: 16, 
                background: 'linear-gradient(135deg, #37e6c4, #1b2140)', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 60
              }}
            >
              🎵
            </div>
            <div>
              <div className="eyebrow">Playlist</div>
              <h1 style={{ fontSize: 48, marginBottom: 10, lineHeight: 1.1 }}>{playlist.name}</h1>
              {playlist.description && (
                <p style={{ color: 'var(--text-dim)', fontSize: 16, marginBottom: 10 }}>{playlist.description}</p>
              )}
              <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                {tracks.length} tracks
              </p>
              
              {tracks.length > 0 && (
                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: 20 }}
                  onClick={() => player.playTrack(tracks[0], tracks)}
                >
                  ▶ Play All
                </button>
              )}
            </div>
          </div>

          {/* Tracklist */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
            {tracks.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', padding: '20px 0' }}>This playlist is empty. Go to Discover to add songs!</p>
            ) : (
              tracks.map((t, i) => (
                <div 
                  key={t.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 0', 
                    borderBottom: '1px solid var(--line)',
                    gap: 16
                  }}
                >
                  <div style={{ width: 30, color: 'var(--text-dim)', fontSize: 14, textAlign: 'center' }}>
                    {player.current?.id === t.id && player.playing ? (
                      <span style={{ color: 'var(--yellow)' }}>♫</span>
                    ) : (
                      i + 1
                    )}
                  </div>
                  
                  <div 
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => player.playTrack(t, tracks)}
                  >
                    <div style={{ color: player.current?.id === t.id ? 'var(--yellow)' : 'var(--text)', fontWeight: 600 }}>
                      {t.title}
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                      {t.artist_name}
                    </div>
                  </div>

                  {isOwner && (
                    <button 
                      onClick={() => removeTrack(t.id)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--pink)', 
                        cursor: 'pointer',
                        fontSize: 18,
                        padding: '4px 8px'
                      }}
                      title="Remove from playlist"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  )
}