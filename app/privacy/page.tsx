import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <Link href="/" className="logo">JIG'S<span className="dot">Wurl</span>D</Link>
          </nav>
        </div>
      </header>
      <main>
        <div className="wrap" style={{ maxWidth: 720, margin: '60px auto', padding: '0 20px 120px' }}>
          <div className="eyebrow">Legal</div>
          <h1 style={{ marginBottom: 24 }}>Privacy Policy</h1>
          
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 20 }}>
            JIG'SWurlD respects your privacy. This policy explains what data we collect, why we collect it, and how we protect it.
          </p>

          <h3>1. Information We Collect</h3>
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 16 }}>
            To provide our service, we collect your name, email address, and account type (Artist or Listener). Artists also provide audio files, cover art, and lyrics. We also collect basic listening data (play counts, likes) to power the discovery algorithm and artist analytics.
          </p>

          <h3>2. Payment Information</h3>
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 16 }}>
            We use Stripe to process tips. <b>JIG'SWurlD never stores your credit card numbers.</b> All payment data is handled securely by Stripe's encrypted infrastructure.
          </p>

          <h3>3. How We Use Your Data</h3>
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 16 }}>
            We use your data strictly to operate the platform: streaming your music, processing tips, sending password reset emails, and displaying your analytics. We do not sell your personal data to third parties.
          </p>

          <h3>4. Your Rights</h3>
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 16 }}>
            You have the right to delete your account and your uploaded music at any time. If you delete your account, your audio files and personal data are permanently removed from our servers.
          </p>

          <p style={{ marginTop: 30, fontSize: 13 }}>
            <Link href="/terms" style={{ color: 'var(--yellow)' }}>Read Terms & Conditions</Link> · 
            <Link href="/" style={{ color: 'var(--yellow)', marginLeft: 10 }}>Back home</Link>
          </p>
        </div>
      </main>
    </>
  )
}