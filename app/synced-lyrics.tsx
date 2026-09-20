'use client'

import { useEffect, useRef } from 'react'

type Cue = { t: number; text: string }

export function parseSynced(raw: string): Cue[] {
  const cues: Cue[] = []
  for (const line of raw.split('\n')) {
    const lrc = line.match(/^\s*\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]\s*(.*)$/)
    const plain = line.match(/^\s*(\d{1,2}):(\d{1,2})\s+(.*)$/)
    if (lrc) {
      const ms = lrc[3] ? parseInt(lrc[3].padEnd(3, '0')) / 1000 : 0
      cues.push({ t: parseInt(lrc[1]) * 60 + parseInt(lrc[2]) + ms, text: lrc[4] })
    } else if (plain) {
      cues.push({ t: parseInt(plain[1]) * 60 + parseInt(plain[2]), text: plain[3] })
    }
  }
  return cues.sort((a, b) => a.t - b.t)
}

export default function SyncedLyrics({
  raw,
  time,
  onSeek,
}: {
  raw: string
  time: number
  onSeek: (t: number) => void
}) {
  const cues = parseSynced(raw)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLDivElement | null>(null)

  let active = -1
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].t <= time) active = i
  }

  useEffect(() => {
    const el = activeRef.current
    const box = boxRef.current
    if (el && box) {
      box.scrollTo({
        top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2,
        behavior: 'smooth',
      })
    }
  }, [active])

  if (cues.length === 0) return null

  return (
    <div ref={boxRef} style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 2px' }}>
      {cues.map((c, i) => (
        <div
          key={i}
          ref={i === active ? activeRef : null}
          onClick={() => onSeek(c.t)}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            cursor: 'pointer',
            color: i === active ? 'var(--yellow)' : 'var(--text-dim)',
            fontWeight: i === active ? 700 : 400,
            fontSize: i === active ? 15 : 13.5,
            background: i === active ? 'rgba(255,200,69,0.08)' : 'transparent',
            transition: 'all .2s',
          }}
        >
          {c.text}
        </div>
      ))}
    </div>
  )
}