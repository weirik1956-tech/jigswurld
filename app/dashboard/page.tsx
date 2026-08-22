'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Profile = { id: string; full_name: string; role: string; created_at: string }
type Track = { id: string; title: string; is_published: boolean }
type Play = { track_id: string }

const BAR_HEIGHTS = [35, 60, 45, 75, 52, 80, 64, 90, 70, 58, 84, 66, 48, 76]

function Bars() {
  return (
    <div className="bars">
      {BAR_HEIGHTS.map((h, i) => (
        <i key={i} style={{ height: h + '%' }} />
      ))}
    </div>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function DashboardPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [plays, setPlays] = useState<Play[]>([])
  const [followers, setFollowers] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profErr) {
        setMessage(profErr.message)
        setLoading(false)
        return
      }

      if (!prof) {
        setLoading(false)
        return
      }

      setProfile(prof as Profile)

      const { data: tr, error: trErr } = await supabase
        .from('tracks')
        .select('id, title, is_published')
        .eq('artist_id', session.user.id)
        .order('created_at', { ascending: false })

      if (trErr) setMessage(trErr.message)
      const trackList = (tr ?? []) as Track[]
      setTracks(trackList)

      if (trackList.length > 0) {
        const ids = trackList.map((t) => t.id)
        const { data: pl } = await supabase
          .from('plays')
          .select('track_id')
          .in('track_id', ids)

        setPlays((pl ?? []) as Play[])
      }

      const { data: fol } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('artist_id', session.user.id)

      setFollowers((fol ?? []).length)
      setLoading(false)
    }

    load()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }
    async function shareTrack(t: Track) {
    const url = `https://jigswurld-xw5l.vercel.app/discover?track=${t.id}`
    const text = `🎧 "${t.title}" by ${profile?.full_name} on JIG'SWurlD`

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
      setMessage('Share link copied — paste it anywhere!')
    } catch {
      setMessage(url)
    }
  }

  function playCount(trackId: string) {
    return plays.filter((p) => p.track_id === trackId).length
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

      <main id="top">
        <section>
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">Artist dashboard</div>
              <h2>Know exactly how you're growing.</h2>
              <p>Every stream and every follow — pulled live from your database.</p>
            </div>

            {message && <p style={{ color: 'var(--pink)', marginBottom: 16 }}>{message}</p>}

            {loading || !profile ? (
              <p>Loading your dashboard...</p>
            ) : (
              <>
                <div className="dash-grid">
                  <div className="dash-card">
                    <div className="label">Total Streams</div>
                    <div className="value">{plays.length}</div>
                    <div className="delta up">↑ live as fans play your tracks</div>
                    <Bars />
                  </div>

                  <div className="dash-card">
                    <div className="label">Your Tracks</div>
                    <div className="value">{tracks.length}</div>
                    <div className="delta up">
                      {tracks.filter((t) => t.is_published).length} published
                    </div>
                    <Bars />
                  </div>

                  <div className="dash-card">
                    <div className="label">Fan Growth</div>
                    <div className="value">{followers}</div>
                    <div className="delta up">↑ followers since you joined</div>
                    <Bars />
                  </div>

                  <div className="dash-card">
                    <div className="label">Account</div>
                    <div className="value" style={{ fontSize: 18 }}>
                      {cap(profile.role)} — {profile.full_name}
                    </div>
                    <div className="delta" style={{ color: 'var(--text-dim)' }}>
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </div>
                    <Bars />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
                  <Link href="/upload" className="btn btn-primary">Upload Track</Link>
                  <Link href="/discover" className="btn btn-ghost">Discover</Link>
                  {profile.role === 'admin' && (
                    <Link href="/admin" className="btn btn-ghost">Admin</Link>
                  )}
                  <button onClick={logout} className="btn btn-ghost">Log out</button>
                </div>

                <div className="locked-note" style={{ marginTop: 28 }}>
                  💰 Earnings & tips unlock with Stripe — that's the next money module.
                </div>

                <div className="tracklist" style={{ marginTop: 8 }}>
                  {tracks.length === 0 && (
                    <div className="locked-note">
                      No tracks yet —{' '}
                      <Link href="/upload" style={{ color: 'var(--yellow)' }}>
                        upload your first release
                      </Link>
                      .
                    </div>
                  )}
                  {tracks.map((t, i) => (
                    <div className="track-row" key={t.id}>
                      <span className="track-num">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h4>{t.title}</h4>
                        <p>{t.is_published ? 'Published' : 'Draft'}</p>
                      </div>
                                           <div className="tags">
                        <span className="tag">{playCount(t.id)} plays</span>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => shareTrack(t)}
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  )
}