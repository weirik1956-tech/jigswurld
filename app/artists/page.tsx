'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Artist = {
  id: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  followers: number
  tracks: number
}

const FALLBACKS = [
  'linear-gradient(135deg,#ff4d6d,#ffc845)',
  'linear-gradient(135deg,#37e6c4,#1b2140)',
  'linear-gradient(135deg,#ffc845,#0e1122)',
  'linear-gradient(135deg,#ff4d6d,#37e6c4)',
]

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, bio, avatar_url')
        .eq('role', 'artist')

      const list: Artist[] = (profs ?? []).map((p) => ({
        ...p,
        followers: 0,
        tracks: 0,
      }))

      if (list.length > 0) {
        const ids = list.map((a) => a.id)
        const { data: fols } = await supabase.from('follows').select('artist_id').in('artist_id', ids)
        const { data: trks } = await supabase.from('tracks').select('artist_id').in('artist_id', ids)
        const fc: Record<string, number> = {}
        const tc: Record<string, number> = {}
        for (const f of fols ?? []) fc[f.artist_id] = (fc[f.artist_id] || 0) + 1
        for (const t of trks ?? []) tc[t.artist_id] = (tc[t.artist_id] || 0) + 1
        list.forEach((a) => {
          a.followers = fc[a.id] || 0
          a.tracks = tc[a.id] || 0
        })
      }

      setArtists(list)
    } finally {
      setLoading(false)
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
              <Link href="/discover" className="btn btn-ghost">Discover</Link>
              <Link href="/upload" className="btn btn-primary">Upload</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap" style={{ padding: '50px 28px 140px' }}>
          <div className="eyebrow">The roster</div>
          <h1 style={{ marginBottom: 6 }}>Artists</h1>
          <p style={{ color: 'var(--text-dim)', marginBottom: 30 }}>
            Every independent artist building on JIG'SWurlD. Follow them before they blow up.
          </p>

          {loading ? (
            <p>Loading artists...</p>
          ) : artists.length === 0 ? (
            <div className="locked-note">No artists yet. Be the first — upload a track!</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 20,
              }}
            >
              {artists.map((a, i) => (
                <Link
                  key={a.id}
                  href={'/artist/' + a.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 16,
                    padding: 20,
                    background: 'var(--bg-alt)',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: FALLBACKS[i % FALLBACKS.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 26,
                      color: 'var(--bg)',
                      marginBottom: 14,
                      overflow: 'hidden',
                    }}
                  >
                    {a.avatar_url ? (
                      <img
                        src={a.avatar_url}
                        alt={a.full_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      (a.full_name || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 4 }}>
                    {a.full_name}
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 8 }}>
                    {a.tracks} tracks · {a.followers} followers
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.5 }}>
                    {(a.bio || 'Independent artist on JIG\'SWurlD.').slice(0, 80)}
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