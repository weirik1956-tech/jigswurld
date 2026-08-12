// setup.mjs — creates all JIG'SWurlD starter files automatically
import fs from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const base = fs.existsSync(path.join(cwd, 'src')) ? 'src' : '.'

const files = {}

files[path.join(base, 'lib/supabase.ts')] = `import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(url, anonKey)
`

files[path.join(base, 'app/page.tsx')] = `import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>JIG'SWurlD</h1>
      <p>Where artists get heard, not buried.</p>

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Link href="/login">Login / Signup</Link>
        <Link href="/discover">Discover</Link>
      </div>
    </main>
  )
}
`

files[path.join(base, 'app/login/page.tsx')] = `'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'artist' | 'listener'>('artist')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
            },
          },
        })

        if (error) throw error

        if (data.session) {
          router.push('/dashboard')
        } else {
          setMessage('Account created. Check your email to confirm, then log in.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        router.push('/dashboard')
      }
    } catch (err: any) {
      setMessage(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>JIG'SWurlD</h1>
      <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {mode === 'signup' && (
          <>
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ padding: 10 }}
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'artist' | 'listener')}
              style={{ padding: 10 }}
            >
              <option value="artist">I am an Artist</option>
              <option value="listener">I am a Listener</option>
            </select>
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{ padding: 10 }}
        />

        <button disabled={loading} style={{ padding: 12 }}>
          {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}

      <div style={{ marginTop: 20 }}>
        {mode === 'login' ? (
          <button onClick={() => setMode('signup')}>
            New here? Create an account
          </button>
        ) : (
          <button onClick={() => setMode('login')}>
            Already have an account? Log in
          </button>
        )}
      </div>
    </main>
  )
}
`

files[path.join(base, 'app/dashboard/page.tsx')] = `'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  full_name: string
  role: string
}

export default function DashboardPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        setMessage(error.message)
      } else {
        setProfile(data as Profile)
      }
    }

    load()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Dashboard</h1>

      {message && <p>{message}</p>}

      {!profile ? (
        <p>Loading...</p>
      ) : (
        <>
          <p>Name: {profile.full_name}</p>
          <p>Role: {profile.role}</p>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Link href="/discover">Discover</Link>

            {profile.role === 'artist' && (
              <Link href="/upload">Upload Track</Link>
            )}
          </div>

          <div style={{ marginTop: 30 }}>
            <button onClick={logout}>Log out</button>
          </div>
        </>
      )}
    </main>
  )
}
`

files[path.join(base, 'app/upload/page.tsx')] = `'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function UploadPage() {
  const router = useRouter()

  const [allowed, setAllowed] = useState(false)
  const [title, setTitle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile?.role !== 'artist') {
        setMessage('Only artist accounts can upload tracks.')
        return
      }

      setAllowed(true)
    }

    check()
  }, [router])

  async function uploadToBucket(bucket: string, file: File, folder: string) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const path = \`\${folder}/\${crypto.randomUUID()}.\${ext}\`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: false,
      })

    if (error) throw error

    return path
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!audioFile) {
      setMessage('Please choose an audio file.')
      return
    }

    if (!title.trim()) {
      setMessage('Please enter a track title.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not logged in.')
      }

      const userId = session.user.id

      if (
        !audioFile.type.startsWith('audio/') &&
        !/\\.(mp3|wav)$/i.test(audioFile.name)
      ) {
        throw new Error('Audio file must be MP3 or WAV.')
      }

      if (coverFile && !coverFile.type.startsWith('image/')) {
        throw new Error('Cover art must be an image.')
      }

      const audioPath = await uploadToBucket('tracks', audioFile, userId)

      let coverPath: string | null = null

      if (coverFile) {
        coverPath = await uploadToBucket('covers', coverFile, userId)
      }

      const slug = \`\${slugify(title)}-\${crypto.randomUUID().slice(0, 8)}\`

      const { error } = await supabase
        .from('tracks')
        .insert({
          artist_id: userId,
          title: title.trim(),
          slug,
          audio_path: audioPath,
          cover_path: coverPath,
          lyrics: lyrics.trim() || null,
          is_published: true,
        })

      if (error) throw error

      setMessage('Track uploaded successfully.')

      router.push('/discover')
    } catch (err: any) {
      setMessage(err.message || 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  if (!allowed) {
    return (
      <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <p>{message || 'Checking permissions...'}</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 520, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Upload Track</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        <input
          type="text"
          placeholder="Track title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <textarea
          placeholder="Lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={6}
          style={{ padding: 10 }}
        />

        <div>
          <label>Audio file MP3/WAV</label>
          <input
            type="file"
            accept="audio/mpeg,audio/wav,audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            required
          />
        </div>

        <div>
          <label>Cover art</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
          />
        </div>

        <button disabled={loading} style={{ padding: 12 }}>
          {loading ? 'Uploading...' : 'Upload Track'}
        </button>

        {message && <p>{message}</p>}
      </form>
    </main>
  )
}
`

files[path.join(base, 'app/discover/page.tsx')] = `'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Track = {
  id: string
  title: string
  audio_path: string
  cover_path?: string | null
  artist_id: string
  artist_name?: string
}

function storageUrl(bucket: string, path: string) {
  return \`\${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/\${bucket}/\${path}\`
}

export default function DiscoverPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    loadTracks()
  }, [])

  async function loadTracks() {
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

      const artistIds = Array.from(
        new Set(tracksData.map((track) => track.artist_id))
      )

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', artistIds)

      const names = Object.fromEntries(
        (profilesData ?? []).map((profile) => [profile.id, profile.full_name])
      )

      const tracksWithArtist = tracksData.map((track) => ({
        ...track,
        artist_name: names[track.artist_id] || 'Unknown Artist',
      }))

      setTracks(tracksWithArtist)
    } catch (err: any) {
      setMessage(err.message || 'Could not load tracks.')
    }
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setCurrentId(null)
    }
  }

  async function logPlay(trackId: string) {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return

    await supabase.from('plays').insert({
      track_id: trackId,
      listener_id: session.user.id,
    })
  }

  async function playTrack(track: Track) {
    stopAudio()

    const audio = new Audio(storageUrl('tracks', track.audio_path))

    audioRef.current = audio
    setCurrentId(track.id)

    audio.onended = () => {
      setCurrentId(null)
    }

    try {
      await audio.play()
      await logPlay(track.id)
    } catch (err: any) {
      setMessage('Playback failed: ' + err.message)
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Discover</h1>

      <div style={{ margin: '16px 0' }}>
        <Link href="/dashboard">Dashboard</Link>
      </div>

      {message && <p>{message}</p>}

      {tracks.length === 0 ? (
        <p>No published tracks yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {tracks.map((track) => (
            <div
              key={track.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                gap: 16,
                alignItems: 'center',
              }}
            >
              {track.cover_path ? (
                <img
                  src={storageUrl('covers', track.cover_path)}
                  alt={track.title}
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 8,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    background: '#eee',
                  }}
                />
              )}

              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{track.title}</h3>
                <p style={{ margin: '4px 0 0', color: '#666' }}>
                  {track.artist_name}
                </p>
              </div>

              {currentId === track.id ? (
                <button onClick={stopAudio}>Stop</button>
              ) : (
                <button onClick={() => playTrack(track)}>Play</button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
`

// ---- write everything ----
for (const [rel, content] of Object.entries(files)) {
  const full = path.join(cwd, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf8')
  console.log('created:', rel)
}

// ---- .env.local (only if missing) ----
const envPath = path.join(cwd, '.env.local')
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(
    envPath,
    `NEXT_PUBLIC_SUPABASE_URL=https://jhpkakotbcxsqtxlamde.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PASTE_YOUR_sb_publishable_KEY_HERE
`,
    'utf8'
  )
  console.log('created: .env.local  <-- OPEN IT AND PASTE YOUR PUBLISHABLE KEY')
} else {
  console.log('.env.local already exists - skipped')
}

console.log('')
console.log('DONE! Next: npm run dev')