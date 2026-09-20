'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const [genre, setGenre] = useState('Hip-Hop')
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

      if (profile?.role !== 'artist' && profile?.role !== 'admin') {
        setMessage('Only artist accounts can upload tracks.')
        return
      }

      setAllowed(true)
    }

    check()
  }, [router])

  async function uploadToBucket(bucket: string, file: File, folder: string) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const path = `${folder}/${crypto.randomUUID()}.${ext}`

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
        !/\.(mp3|wav)$/i.test(audioFile.name)
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

      const slug = `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`

      const { error } = await supabase
        .from('tracks')
        .insert({
          artist_id: userId,
          title: title.trim(),
          slug,
          genre,
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
        <main style={{ padding: 24, maxWidth: 520, margin: '60px auto' }}>
          <p>{message || 'Checking permissions...'}</p>
        </main>
      </>
    )
  }

  const inputStyle = {
    padding: 12,
    borderRadius: 10,
    border: '1px solid var(--line)',
    background: 'var(--bg-alt)',
    color: 'var(--text)',
    fontSize: 14,
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
              <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
            </div>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 520, margin: '60px auto', padding: 24 }}>
        <div className="eyebrow">Release music</div>
        <h1 style={{ marginBottom: 6 }}>Upload Track</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
          Publish instantly. Keep your masters. Tag your genre so fans can find you.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <input
            type="text"
            placeholder="Track title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={inputStyle}
          />

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-dim)' }}>
              Genre
            </span>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            >
              <option value="Hip-Hop">Hip-Hop</option>
              <option value="R&B">R&B</option>
              <option value="Afrobeats">Afrobeats</option>
              <option value="Gospel">Gospel</option>
              <option value="Pop">Pop</option>
              <option value="Album">Album</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <textarea
            placeholder="Lyrics (optional)"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          />

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-dim)' }}>
              Audio file (MP3/WAV) *
            </span>
            <input
              type="file"
              accept="audio/mpeg,audio/wav,audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              required
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-dim)' }}>
              Cover art (optional)
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              style={inputStyle}
            />
          </label>

          <button disabled={loading} className="btn btn-primary" style={{ justifyContent: 'center' }}>
            {loading ? 'Uploading...' : 'Upload Track'}
          </button>

          {message && <p style={{ color: message.includes('success') ? 'var(--mint)' : 'var(--pink)' }}>{message}</p>}
        </form>
      </main>
    </>
  )
}