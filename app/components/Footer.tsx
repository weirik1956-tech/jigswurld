import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--line)',
      padding: '30px 0',
      marginTop: '80px',
      fontSize: 13,
      color: 'var(--text-dim)',
      textAlign: 'center',
      background: 'var(--bg-alt)'
    }}>
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ color: 'var(--text-dim)' }}>Terms & Conditions</Link>
          <Link href="/privacy" style={{ color: 'var(--text-dim)' }}>Privacy Policy</Link>
          <Link href="/reset" style={{ color: 'var(--text-dim)' }}>Forgot Password</Link>
        </div>
        <div style={{ fontSize: 12 }}>
          © {new Date().getFullYear()} JIG'SWurlD. Independent artists keep 100% of their masters.
        </div>
      </div>
    </footer>
  )
}