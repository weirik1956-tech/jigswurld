import Link from 'next/link'
import SearchBar from './SearchBar'

export default function Header() {
  return (
    <header style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
        <Link href="/" className="logo" style={{ textDecoration: 'none', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
          JIG'S<span className="dot" style={{ color: 'var(--pink)' }}>Wurl</span>D
        </Link>
        
        <SearchBar />
        
        <div className="nav-cta" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/discover" className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: 14 }}>Discover</Link>
          <Link href="/library" className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: 14 }}>Library</Link>
          <Link href="/dashboard" className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: 14 }}>Dashboard</Link>
          <Link href="/upload" className="btn btn-primary" style={{ textDecoration: 'none', fontSize: 14 }}>Upload</Link>
        </div>
      </div>
    </header>
  )
}