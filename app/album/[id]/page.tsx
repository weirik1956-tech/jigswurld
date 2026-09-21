'use client'

import { useEffect, useState } from 'react'
import { useParams, Link } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/app/player-context'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
  artist_id: string
  artist_name?: string
  track_number?: number
}

function storageUrl(bucket: string, path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

export default function AlbumPage() {
  const params = useParams<{ id: string }>()
  const albumId = params.id
  const player = usePlayer()

  const [album, setAlbum] = useState<any>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!albumId) return
    loadAlbum()
  }, [albumId])

  async function loadAlbum() {
    const { data: albumData } = await supabase.from('albums').select('*').eq('id', albumId).maybeSingle()
    if (!albumData) { setLoading(false); return }
    setAlbum(albumData)

    const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', albumData.artist_id).maybeSingle()
    const artistName = prof?.full_name || 'Unknown Artist'

    const { data: tracksData } = await supabase.from('tracks').select('*').eq('album_id', albumId).order('created_at', { ascending: true })
    
    const finalTracks: Track[] = (tracksData || []).map((t, i) => ({
      ...t,
      artist_name: artistName,
      track_number: i + 1,
    }))
    
    setTracks(finalTracks)
    setLoading(false)
  }

  if (loading) return <div style={{padding: 40}}>Loading album...</div>
  if (!album) return <div style={{padding: 40}}>Album not found.</div>

  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <Link href="/" className="logo">JIG'S<span className="dot">Wurl</span>D</Link>
            <div className="nav-cta">
              <Link href="/discover" className="btn btn-ghost">Discover</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap" style={{ padding: '50px 28px 140px', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 30, alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap' }}>
            <div style={{ width: 240, height: 240, borderRadius: 16, background: 'linear-gradient(135deg,#ff4d6d,#ffc845)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
            <div>
              <div className="eyebrow">Album</div>
              <h1 style={{ fontSize: 48, marginBottom: 10 }}>{album.title}</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: 16 }}>
                By <Link href={`/artist/${album.artist_id}`} style={{ color: 'var(--yellow)' }}>{album.artist_name || 'Unknown Artist'}</Link> · {tracks.length} tracks
              </p>
              <button 
                className="btn btn-primary" 
                style={{ marginTop: 20 }}
                onClick={() => tracks.length > 0 && player.playTrack(tracks[0], tracks)}
              >
                ▶ Play All
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
            {tracks.map((t, i) => (
              <div 
                key={t.id} 
                style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                onClick={() => player.playTrack(t, tracks)}
              >
                <div style={{ width: 30, color: 'var(--text-dim)', fontSize: 14 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text)', fontWeight: 600 }}>{t.title}</div>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                  {player.current?.id === t.id && player.playing ? 'Playing...' : 'Play'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}