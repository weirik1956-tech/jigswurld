'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Album = {
  id: string
  title: string
  description: string | null
  artist_name: string
  artist_id: string
  track_count: number
  created_at: string
}

const FALLBACKS = [
  'linear-gradient(135deg,#ff4d6d,#ffc845)',
  'linear-gradient(135deg,#37e6c4,#1b2140)',
  'linear-gradient(135deg,#ffc845,#0e1122)',
]

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlbums()
  }, [])

  async function loadAlbums() {
    const { data: albumsData } = await supabase
      .from('albums')
      .select('id, title, description, artist_id, created_at')
      .order('created_at', { ascending: false })

    if (!albumsData || albumsData.length === 0) {
      setLoading(false)
      return
    }

    const artistIds = Array.from(new Set(albumsData.map((a) => a.artist_id)))
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', artistIds)
    const names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]))

    const albumIds = albumsData.map((a) => a.id)
    const { data: tracks } = await supabase.from('tracks').select('album_id').in('album_id', albumIds)
    const counts: Record<string, number> = {}
    for (const t of tracks ?? []) counts[t.album_id] = (counts[t.album_id] || 0) + 1

    const finalList: Album[] = albumsData.map((a) => ({
      ...a,
      artist_name: names[a.artist_id] || 'Unknown Artist',
      track_count: counts[a.id] || 0,
    }))

    setAlbums(finalList)
    setLoading(false)
  }

  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <Link href="/" className="logo">JIG'S<span className="dot">Wurl</span>D</Link>
            <div className="nav-cta">
              <Link href="/discover" className="btn btn-ghost">Discover</Link>
              <Link href="/upload" className="btn btn-primary">Upload</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap" style={{ padding: '50px 28px 140px' }}>
          <div className="eyebrow">Full Projects</div>
          <h1 style={{ marginBottom: 24 }}>Albums & EPs</h1>

          {loading ? <p>Loading albums...</p> : albums.length === 0 ? (
            <div className="locked-note">No albums released yet. Artists can group tracks when uploading!</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
              {albums.map((a, i) => (
                <Link key={a.id} href={`/album/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', background: 'var(--bg-alt)', transition: 'transform 0.2s' }}>
                    <div style={{ aspectRatio: '1/1', background: FALLBACKS[i % FALLBACKS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--bg)' }}>
                      📀
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{a.title}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 8 }}>{a.artist_name}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{a.track_count} tracks · {new Date(a.created_at).getFullYear()}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}