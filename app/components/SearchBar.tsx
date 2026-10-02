'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type SearchResult = {
  type: 'track' | 'artist' | 'album'
  id: string
  title: string
  subtitle: string
  cover_path?: string | null
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      const q = query.trim()
      
      try {
        // 1. Search Tracks
        const { data: tracks } = await supabase
          .from('tracks')
          .select('id, title, artist_id, cover_path')
          .ilike('title', `%${q}%`)
          .eq('is_published', true)
          .limit(4)

        // 2. Search Artists
        const { data: artists } = await supabase
          .from('profiles')
          .select('id, full_name')
          .ilike('full_name', `%${q}%`)
          .eq('role', 'artist')
          .limit(3)

        // 3. Search Albums
        const { data: albums } = await supabase
          .from('albums')
          .select('id, title, artist_id')
          .ilike('title', `%${q}%`)
          .limit(3)

        // Fetch artist names for tracks and albums
        const artistIds = new Set([
          ...(tracks || []).map((t: any) => t.artist_id),
          ...(albums || []).map((a: any) => a.artist_id)
        ])
        
        let artistNames: Record<string, string> = {}
        if (artistIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', Array.from(artistIds))
          artistNames = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]))
        }

        const formattedResults: SearchResult[] = [
          ...(tracks || []).map((t: any) => ({
            type: 'track' as const,
            id: t.id,
            title: t.title,
            subtitle: artistNames[t.artist_id] || 'Unknown Artist',
            cover_path: t.cover_path
          })),
          ...(artists || []).map((a: any) => ({
            type: 'artist' as const,
            id: a.id,
            title: a.full_name,
            subtitle: 'Artist'
          })),
          ...(albums || []).map((a: any) => ({
            type: 'album' as const,
            id: a.id,
            title: a.title,
            subtitle: `Album by ${artistNames[a.artist_id] || 'Unknown Artist'}`
          }))
        ]

        setResults(formattedResults)
        setIsOpen(true)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [query])

  const getIcon = (type: string) => {
    if (type === 'track') return '🎵'
    if (type === 'artist') return '👤'
    return '💿'
  }

  const getLink = (item: SearchResult) => {
    if (item.type === 'track') return `/track/${item.id}`
    if (item.type === 'artist') return `/artist/${item.id}`
    return `/album/${item.id}`
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, maxWidth: 400, margin: '0 20px' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>🔍</span>
        <input
          type="text"
          placeholder="Search songs, artists, albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'var(--bg-alt)',
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none'
          }}
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 8,
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          zIndex: 1000,
          maxHeight: 400,
          overflowY: 'auto'
        }}>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Searching...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>No results found for "{query}"</div>
          ) : (
            <div>
              {results.map((item, i) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={getLink(item)}
                  onClick={() => { setIsOpen(false); setQuery('') }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    textDecoration: 'none',
                    color: 'var(--text)',
                    borderBottom: i < results.length - 1 ? '1px solid var(--line)' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-alt)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 18 }}>{getIcon(item.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {item.subtitle}
                    </div>
                  </div>
                </Link>
              ))}
              <Link 
                href={`/discover?search=${encodeURIComponent(query)}`}
                onClick={() => { setIsOpen(false); setQuery('') }}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: 12,
                  color: 'var(--yellow)',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  borderTop: '1px solid var(--line)'
                }}
              >
                View all results for "{query}" →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}