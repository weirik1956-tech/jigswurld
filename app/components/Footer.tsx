import Link from 'next/link'

const linkStyle = {
  color: 'var(--text-dim)',
  textDecoration: 'none',
  fontSize: 13,
}

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line)',
        padding: '50px 0 25px',
        marginTop: 80,
        background: 'var(--bg-alt)',
        color: 'var(--text-dim)',
      }}
    >
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 35 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 40,
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
              JIG'SWurlD
            </div>
            <p style={{ margin: 0, maxWidth: 280, lineHeight: 1.6, fontSize: 13 }}>
              Discover independent music, support artists, and listen to music without the noise.
            </p>
          </div>

          <div>
            <h3 style={{ color: 'var(--text)', fontSize: 14, marginBottom: 14 }}>Explore</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/discover" style={linkStyle}>Discover</Link>
              <Link href="/artists" style={linkStyle}>Artists</Link>
            </div>
          </div>

          <div>
            <h3 style={{ color: 'var(--text)', fontSize: 14, marginBottom: 14 }}>For Artists</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/upload" style={linkStyle}>Upload Music</Link>
              <Link href="/dashboard" style={linkStyle}>Artist Dashboard</Link>
              <Link href="/dashboard" style={linkStyle}>Analytics</Link>
              <Link href="/terms" style={linkStyle}>Artist Guidelines</Link>
            </div>
          </div>

          <div>
            <h3 style={{ color: 'var(--text)', fontSize: 14, marginBottom: 14 }}>Support</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/support" style={linkStyle}>Help Center</Link>
              <Link href="/support#contact" style={linkStyle}>Contact Us</Link>
              <Link href="/support#report" style={linkStyle}>Report a Problem</Link>
              <Link href="/support#copyright" style={linkStyle}>Copyright</Link>
            </div>
          </div>
        </div>

        <div
          style={{
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '22px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, marginBottom: 5 }}>
              Are you an artist?
            </div>
            <div style={{ fontSize: 13 }}>Share your music with the JIG'SWurlD community.</div>
          </div>
          <Link
            href="/upload"
            style={{
              background: 'var(--yellow)',
              color: 'var(--bg)',
              padding: '10px 18px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Upload Your Music →
          </Link>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--line)',
            paddingTop: 22,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: 12,
          }}
        >
          <div>© {new Date().getFullYear()} JIG'SWurlD. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Link href="/terms" style={linkStyle}>Terms & Conditions</Link>
            <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>
            <Link href="/reset" style={linkStyle}>Forgot Password</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}