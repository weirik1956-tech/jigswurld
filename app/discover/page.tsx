'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '../player-context'
import Header from '../components/Header'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path: string | null
  lyrics: string | null
  genre: string | null
  artist_id: string
  artist_name?: string
  created_at?: string
}

const FALLBACKS = [
  'linear-gradient(135deg,#ff4d6d,#ffc845)',
  'linear-gradient(135deg,#37e6c4,#1b2140)',
  'linear-gradient(135deg,#ffc845,#0e1122)',
  'linear-gradient(135deg,#ff4d6d,#37e6c4)',
]

const GENRES = ['All', 'Hip-Hop', 'R&B', 'Afrobeats', 'Gospel', 'Pop', 'Other']

function storageUrl(bucket: string, path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

export default function DiscoverPage() {
  const player = usePlayer()

  const [tracks, setTracks] = useState<Track[]>([])
  const [followedTracks, setFollowedTracks] = useState<Track[]>([])
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([])
  const [popularArtists, setPopularArtists] = useState<any[]>([])
  
  const [message, setMessage] = useState('')
  const [myLikes, setMyLikes] = useState<string[]>([])
  const [myFollows, setMyFollows] = useState<string[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({})
  const [lyricsOpen, setLyricsOpen] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  
  const [playlistModalTrack, setPlaylistModalTrack] = useState<Track | null>(null)
  const [userPlaylists, setUserPlaylists] = useState<any[]>([])

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

      const names = Object.fromEntries((profilesData ?? []).map((p) => [p.id, p.full_name]))

      const list = tracksData.map((t) => ({
        ...t,
        artist_name: names[t.artist_id] || 'Unknown Artist',
      }))
      setTracks(list)

      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user.id

      // 1. Followed Artists
      if (uid) {
        const { data: follows } = await supabase.from('follows').select('artist_id').eq('follower_id', uid)
        const followedArtistIds = (follows || []).map(f => f.artist_id)
        setMyFollows(followedArtistIds)

        if (followedArtistIds.length > 0) {
          const { data: fTracks } = await supabase.from('tracks').select('*').in('artist_id', followedArtistIds).eq('is_published', true).order('created_at', { ascending: false }).limit(6)
          if (fTracks) setFollowedTracks(fTracks.map(t => ({ ...t, artist_name: names[t.artist_id] || 'Unknown Artist' })))
        }
      }

      // 2. Trending Tracks (Most Played)
      const { data: allPlays } = await supabase.from('plays').select('track_id')
      const playCounts: Record<string, number> = {}
      allPlays?.forEach((p: any) => { playCounts[p.track_id] = (playCounts[p.track_id] || 0) + 1 })
      const sortedByPlays = [...list].sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0))
      setTrendingTracks(sortedByPlays.slice(0, 4))

      // 3. Popular Artists (Most Followers)
      const { data: allFollows } = await supabase.from('follows').select('artist_id')
      const followCountsGlobal: Record<string, number> = {}
      allFollows?.forEach((f: any) => { followCountsGlobal[f.artist_id] = (followCountsGlobal[f.artist_id] || 0) + 1 })
      const artistList = Object.entries(names).map(([id, name]) => ({ id, name, followers: followCountsGlobal[id] || 0 }))
      const sortedArtists = artistList.sort((a, b) => b.followers - a.followers)
      setPopularArtists(sortedArtists.slice(0, 3))

      // 4. Likes & Follow Counts
      const trackIds = list.map((t) => t.id)
      const { data: likesData } = await supabase.from('likes').select('user_id, track_id').in('track_id', trackIds)
      const lc: Record<string, number> = {}
      const mine: string[] = []
      for (const l of likesData ?? []) {
        lc[l.track_id] = (lc[l.track_id] || 0) + 1
        if (l.user_id === uid) mine.push(l.track_id)
      }
      setLikeCounts(lc)
      setMyLikes(mine)

      const { data: folData } = await supabase.from('follows').select('follower_id, artist_id').in('artist_id', artistIds)
      const fc: Record<string, number> = {}
      for (const f of folData ?? []) fc[f.artist_id] = (fc[f.artist_id] || 0) + 1
      setFollowCounts(fc)

    } catch (err: any) {
      setMessage(err.message || 'Could not load tracks.')
    }
  }

  async function requireSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setMessage('Log in to do that.'); return null }
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
    loadAll()
  }

  async function shareTrack(t: Track) {
    const url = `https://jigswurld-xw5l.vercel.app/track/${t.id}`
    const text = `🎧 "${t.title}" by ${t.artist_name} on JIG'SWurlD`
    if (navigator.share) { try { await navigator.share({ title: "JIG'SWurlD", text, url }); return } catch {} }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setMessage('Share link copied!') } catch { setMessage(url) }
  }

  async function openAddToPlaylist(track: Track) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setMessage('Log in to add to playlists.'); return }
    setPlaylistModalTrack(track)
    const { data } = await supabase.from('playlists').select('id, name').eq('user_id', session.user.id).order('created_at', { ascending: false })
    setUserPlaylists(data || [])
  }

  async function confirmAddToPlaylist(playlistId: string, trackId: string) {
    const { error } = await supabase.from('playlist_tracks').insert({ playlist_id: playlistId, track_id: trackId })
    if (error) setMessage('Already in playlist or error occurred.')
    else { setMessage('Added to playlist! 🎵'); setTimeout(() => setMessage(''), 2000) }
    setPlaylistModalTrack(null)
  }

  const q = search.toLowerCase().trim()
  const filtered = tracks.filter((t) => {
    const matchSearch = !q || t.title.toLowerCase().includes(q) || (t.artist_name || '').toLowerCase().includes(q)
    const matchGenre = selectedGenre === 'All' || (t.genre || 'Other') === selectedGenre
    return matchSearch && matchGenre
  })

  return (
    <>
      <Header />

      <main id="top">
        <section id="discover">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">Discovery engine</div>
              <h2>New releases, before they blow up.</h2>
              <p>Search, filter by genre, and keep the music playing.</p>
            </div>

            {message && <p style={{ color: 'var(--pink)', marginBottom: 16, fontWeight: 600 }}>{message}</p>}

            {/* 1. NEW FROM FOLLOWED ARTISTS */}
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>📢 New from artists you follow</h2>
              {followedTracks.length === 0 ? (
                <div style={{ padding: 32, border: '1px dashed var(--line)', borderRadius: 12, textAlign: 'center', background: 'var(--bg-alt)', color: 'var(--text-dim)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                  <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>Follow artists to see their new releases here.</p>
                  <Link href="/artists" className="btn btn-ghost" style={{ border: '1px solid var(--line)', marginTop: 10 }}>Discover Artists</Link>
                </div>
              ) : (
                <div className="discovery-grid">
                  {followedTracks.map((t, i) => (
                    <div key={t.id} className={'song-card' + (player.current?.id === t.id ? ' playing' : '')} onClick={() => player.playTrack(t, tracks)} style={{ cursor: 'pointer' }}>
                      <div className="cover" style={{ background: FALLBACKS[i % FALLBACKS.length] }}>
                        {t.cover_path && <img src={storageUrl('covers', t.cover_path)} alt={t.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div className="play-overlay"><svg width="34" height="34" viewBox="0 0 24 24" fill="#f5f1e8"><circle cx="12" cy="12" r="11" fill="rgba(11,14,26,0.55)" /><path d="M10 8l6 4-6 4z" fill="#f5f1e8" /></svg></div>
                      </div>
                      <div className="info"><h5>{t.title}</h5><p>{t.artist_name}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. TRENDING NOW */}
            {trendingTracks.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>🔥 Trending Now</h2>
                <div className="discovery-grid">
                  {trendingTracks.map((t, i) => (
                    <div key={t.id} className={'song-card' + (player.current?.id === t.id ? ' playing' : '')} onClick={() => player.playTrack(t, tracks)} style={{ cursor: 'pointer' }}>
                      <div className="cover" style={{ background: FALLBACKS[i % FALLBACKS.length] }}>
                        {t.cover_path && <img src={storageUrl('covers', t.cover_path)} alt={t.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div className="play-overlay"><svg width="34" height="34" viewBox="0 0 24 24" fill="#f5f1e8"><circle cx="12" cy="12" r="11" fill="rgba(11,14,26,0.55)" /><path d="M10 8l6 4-6 4z" fill="#f5f1e8" /></svg></div>
                      </div>
                      <div className="info"><h5>{t.title}</h5><p>{t.artist_name}</p></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. POPULAR ARTISTS */}
            {popularArtists.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>👤 Popular Artists</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                  {popularArtists.map((artist) => (
                    <Link key={artist.id} href={`/artist/${artist.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', gap: 16, transition: 'transform 0.2s' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #ff4d6d, #ffc845)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'white', fontWeight: 800, flexShrink: 0 }}>
                          {artist.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{artist.followers} followers</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* SEARCH & FILTER */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="Search songs or artists..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '12px 16px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {GENRES.map((g) => (
                  <button key={g} onClick={() => setSelectedGenre(g)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--line)', background: selectedGenre === g ? 'var(--pink)' : 'transparent', color: selectedGenre === g ? 'var(--bg)' : 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{g}</button>
                ))}
              </div>
            </div>

            {/* ALL TRACKS */}
            {tracks.length === 0 ? (
              <div className="locked-note">No published tracks yet.</div>
            ) : filtered.length === 0 ? (
              <div className="locked-note">Nothing matches your search.</div>
            ) : (
              <div className="discovery-grid">
                {filtered.map((t, i) => (
                  <div key={t.id} id={'track-' + t.id} className={'song-card' + (player.current?.id === t.id ? ' playing' : '')} onClick={() => player.playTrack(t, filtered)} style={{ cursor: 'pointer' }}>
                    <div className="cover" style={{ background: FALLBACKS[i % FALLBACKS.length] }}>
                      {t.cover_path && <img src={storageUrl('covers', t.cover_path)} alt={t.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                      <div className="play-overlay"><svg width="34" height="34" viewBox="0 0 24 24" fill="#f5f1e8"><circle cx="12" cy="12" r="11" fill="rgba(11,14,26,0.55)" /><path d="M10 8l6 4-6 4z" fill="#f5f1e8" /></svg></div>
                    </div>
                    <div className="info">
                      <h5><Link href={'/track/' + t.id} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit' }}>{t.title}</Link></h5>
                      <p><Link href={'/artist/' + t.artist_id} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit' }}>{t.artist_name}</Link></p>
                      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                        <button className={myLikes.includes(t.id) ? 'active' : ''} onClick={() => toggleLike(t.id)}>♥ {likeCounts[t.id] || 0}</button>
                        <button className={'follow' + (myFollows.includes(t.artist_id) ? ' active' : '')} onClick={() => toggleFollow(t.artist_id)}>{myFollows.includes(t.artist_id) ? 'Following' : 'Follow'} · {followCounts[t.artist_id] || 0}</button>
                        <button onClick={() => openAddToPlaylist(t)}>+ Playlist</button>
                        <button onClick={() => setLyricsOpen(lyricsOpen === t.id ? null : t.id)}>{lyricsOpen === t.id ? 'Hide lyrics' : '♪ Lyrics'}</button>
                        <button onClick={() => shareTrack(t)}>Share</button>
                      </div>
                      {lyricsOpen === t.id && (<pre style={{ whiteSpace: 'pre-wrap', marginTop: 10, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{t.lyrics || 'No lyrics uploaded for this track.'}</pre>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* PLAYLIST MODAL */}
      {playlistModalTrack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPlaylistModalTrack(null)}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Add "{playlistModalTrack.title}" to...</h3>
            {userPlaylists.length === 0 ? (<p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>No playlists yet. Go to <Link href="/library" style={{ color: 'var(--yellow)' }}>Library</Link> to create one.</p>) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {userPlaylists.map((p) => (<button key={p.id} onClick={() => confirmAddToPlaylist(p.id, playlistModalTrack.id)} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-alt)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 600 }}>{p.name}</span><span style={{ color: 'var(--mint)', fontSize: 13 }}>+ Add</span></button>))}
              </div>
            )}
            <button onClick={() => setPlaylistModalTrack(null)} style={{ marginTop: 16, width: '100%', padding: 10, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </>
  )
}