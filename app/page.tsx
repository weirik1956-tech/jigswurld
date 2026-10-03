'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { usePlayer } from './player-context'
import Header from './components/Header'
import Footer from './components/Footer'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
  artist_id: string
  artist_name?: string
}

type Artist = {
  id: string
  full_name: string
  followers: number
  track_count: number
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

export default function HomePage() {
  const player = usePlayer()
  
  const [trending, setTrending] = useState<Track[]>([])
  const [newReleases, setNewReleases] = useState<Track[]>([])
  const [popularArtists, setPopularArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHomepageData() {
      try {
        // 1. Get all published tracks
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (!tracksData || tracksData.length === 0) { setLoading(false); return }

        // Get artist names
        const artistIds = Array.from(new Set(tracksData.map(t => t.artist_id)))
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', artistIds)
        const names = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]))

        const fullTracks: Track[] = tracksData.map(t => ({ ...t, artist_name: names[t.artist_id] || 'Unknown Artist' }))

        // 2. Calculate Trending (Most Played)
        const { data: allPlays } = await supabase.from('plays').select('track_id')
        const playCounts: Record<string, number> = {}
        allPlays?.forEach((p: any) => { playCounts[p.track_id] = (playCounts[p.track_id] || 0) + 1 })
        const sortedTrending = [...fullTracks].sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0))
        setTrending(sortedTrending.slice(0, 4))

        // 3. New Releases (Already sorted by created_at desc)
        setNewReleases(fullTracks.slice(0, 4))

        // 4. Popular Artists
        const { data: allFollows } = await supabase.from('follows').select('artist_id')
        const followCounts: Record<string, number> = {}
        allFollows?.forEach((f: any) => { followCounts[f.artist_id] = (followCounts[f.artist_id] || 0) + 1 })
        
        const artistList: Artist[] = artistIds.map(id => ({
          id,
          full_name: names[id] || 'Unknown Artist',
          followers: followCounts[id] || 0,
          track_count: fullTracks.filter(t => t.artist_id === id).length
        }))
        const sortedArtists = artistList.sort((a, b) => b.followers - a.followers)
        setPopularArtists(sortedArtists.slice(0, 3))

      } catch (err) {
        console.error('Homepage load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadHomepageData()
  }, [])

  const featuredTrack = newReleases[0] // The newest track becomes the "Featured" demo

  return (
    <>
      <Header />

      <main>
        {/* HERO SECTION */}
        <section style={{ padding: '80px 0 60px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>
          <div className="wrap" style={{ maxWidth: 800 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>JIG'SWurlD</div>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.1, marginBottom: 24, fontWeight: 800 }}>
              WHERE ARTISTS GET HEARD,<br />
              <span style={{ color: 'var(--pink)' }}>NOT BURIED.</span>
            </h1>
            <p style={{ color: 'var(--text-dim)', fontSize: 18, marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
              Upload music. Keep your masters. Support your fans. The independent music platform built for the future.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/upload" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: 16 }}>Start Uploading</Link>
              <Link href="/discover" className="btn btn-ghost" style={{ padding: '14px 28px', fontSize: 16, border: '1px solid var(--line)' }}>Explore Music</Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>Loading the ecosystem...</div>
        ) : (
          <div className="wrap" style={{ padding: '60px 28px' }}>
            
            {/* FEATURED / NOW PLAYING (Interactive Demo) */}
            {featuredTrack && (
              <section style={{ marginBottom: 80 }}>
                <div className="eyebrow" style={{ marginBottom: 16 }}>🎧 Featured Release</div>
                <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-alt)', padding: 32, borderRadius: 20, border: '1px solid var(--line)' }}>
                  <Link 
                    href={`/track/${featuredTrack.id}`} 
                    style={{ width: 240, height: 240, borderRadius: 16, background: FALLBACKS[0], position: 'relative', overflow: 'hidden', flexShrink: 0, textDecoration: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                  >
                    {featuredTrack.cover_path && <img src={storageUrl('covers', featuredTrack.cover_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </Link>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <h2 style={{ fontSize: 36, marginBottom: 8 }}>{featuredTrack.title}</h2>
                    <Link href={`/artist/${featuredTrack.artist_id}`} style={{ color: 'var(--text-dim)', fontSize: 18, textDecoration: 'none', marginBottom: 24, display: 'block' }}>
                      {featuredTrack.artist_name}
                    </Link>
                    
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => player.playTrack(featuredTrack, newReleases)}
                        style={{ padding: '12px 24px' }}
                      >
                        {player.current?.id === featuredTrack.id && player.playing ? 'Pause' : '▶ Play Now'}
                      </button>
                      <Link href={`/track/${featuredTrack.id}`} className="btn btn-ghost" style={{ padding: '12px 24px', border: '1px solid var(--line)', textDecoration: 'none' }}>♡ Like</Link>
                      <Link href={`/track/${featuredTrack.id}`} className="btn btn-ghost" style={{ padding: '12px 24px', border: '1px solid var(--line)', textDecoration: 'none' }}>+ Playlist</Link>
                      <Link href={`/track/${featuredTrack.id}`} className="btn btn-ghost" style={{ padding: '12px 24px', border: '1px solid var(--line)', textDecoration: 'none', color: 'var(--yellow)' }}>💸 Tip Artist</Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TRENDING NOW */}
            {trending.length > 0 && (
              <section style={{ marginBottom: 64 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24 }}>🔥 Trending Now</h2>
                  <Link href="/discover" style={{ color: 'var(--yellow)', textDecoration: 'none', fontSize: 14 }}>View all →</Link>
                </div>
                <div className="discovery-grid">
                  {trending.map((t, i) => (
                    <div key={t.id} className="song-card" onClick={() => player.playTrack(t, trending)} style={{ cursor: 'pointer' }}>
                      <div className="cover" style={{ background: FALLBACKS[i % FALLBACKS.length] }}>
                        {t.cover_path && <img src={storageUrl('covers', t.cover_path)} alt={t.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div className="play-overlay"><svg width="34" height="34" viewBox="0 0 24 24" fill="#f5f1e8"><circle cx="12" cy="12" r="11" fill="rgba(11,14,26,0.55)" /><path d="M10 8l6 4-6 4z" fill="#f5f1e8" /></svg></div>
                      </div>
                      <div className="info">
                        <h5><Link href={`/track/${t.id}`} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>{t.title}</Link></h5>
                        <p><Link href={`/artist/${t.artist_id}`} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>{t.artist_name}</Link></p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* NEW RELEASES */}
            {newReleases.length > 0 && (
              <section style={{ marginBottom: 64 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24 }}>🆕 New Releases</h2>
                  <Link href="/discover" style={{ color: 'var(--yellow)', textDecoration: 'none', fontSize: 14 }}>View all →</Link>
                </div>
                <div className="discovery-grid">
                  {newReleases.map((t, i) => (
                    <div key={t.id} className="song-card" onClick={() => player.playTrack(t, newReleases)} style={{ cursor: 'pointer' }}>
                      <div className="cover" style={{ background: FALLBACKS[(i + 1) % FALLBACKS.length] }}>
                        {t.cover_path && <img src={storageUrl('covers', t.cover_path)} alt={t.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div className="play-overlay"><svg width="34" height="34" viewBox="0 0 24 24" fill="#f5f1e8"><circle cx="12" cy="12" r="11" fill="rgba(11,14,26,0.55)" /><path d="M10 8l6 4-6 4z" fill="#f5f1e8" /></svg></div>
                      </div>
                      <div className="info">
                        <h5><Link href={`/track/${t.id}`} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>{t.title}</Link></h5>
                        <p><Link href={`/artist/${t.artist_id}`} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>{t.artist_name}</Link></p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* DISCOVER ARTISTS */}
            {popularArtists.length > 0 && (
              <section style={{ marginBottom: 64 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24 }}>👤 Artists Worth Discovering</h2>
                  <Link href="/artists" style={{ color: 'var(--yellow)', textDecoration: 'none', fontSize: 14 }}>View all →</Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
                  {popularArtists.map((artist) => (
                    <Link key={artist.id} href={`/artist/${artist.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 24, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', gap: 16, transition: 'transform 0.2s' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #ff4d6d, #ffc845)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'white', fontWeight: 800, flexShrink: 0 }}>
                          {artist.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist.full_name}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{artist.track_count} releases · {artist.followers} followers</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ARTIST CTA */}
            <section style={{ background: 'var(--bg-alt)', border: '1px solid var(--line)', borderRadius: 20, padding: '48px 32px', textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontSize: 28, marginBottom: 12 }}>🎤 Are you an artist?</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 16, marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
                Upload your music. Keep your masters. Reach your listeners directly.
              </p>
              <Link href="/upload" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: 16 }}>Upload Your Music →</Link>
            </section>

          </div>
        )}
      </main>

      <Footer />
    </>
  )
}