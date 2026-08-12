'use client'

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
