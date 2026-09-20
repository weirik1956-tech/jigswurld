import Link from 'next/link'

export const metadata = { title: "Support — JIG'SWurlD" }

const EMAIL = 'successpatrick54321@gmail.com' // swap to support@yourdomain.com when you get one

export default function SupportPage() {
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
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap" style={{ maxWidth: 760, margin: '60px auto', padding: '0 20px 120px' }}>
          <div className="eyebrow">We've got you</div>
          <h1 style={{ marginBottom: 6 }}>Help Center</h1>
          <p style={{ color: 'var(--text-dim)', marginBottom: 30 }}>
            Fast answers, real humans, zero runaround.
          </p>

          <div id="help" style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>Frequently asked</h2>
            {[
              ['How do I upload music?', 'Create an artist account, open Upload, add your MP3/WAV, artwork, genre and lyrics, and hit Upload. It goes live instantly.'],
              ['How do tips work?', 'Fans tip with a card via Stripe. Artists keep 100% of every tip — JIG\'SWurlD takes 0%. Only Stripe\'s standard processing fees apply.'],
              ['I forgot my password.', 'Use the Forgot password link on the login page. We email you a secure, single-use reset link.'],
              ['A track won\'t play.', 'Refresh the page first. Still broken? Report it below with the track name and we\'ll fix it fast.'],
            ].map(([q, a]) => (
              <div key={q} style={{ marginBottom: 14, border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: 'var(--bg-alt)' }}>
                <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{q}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>{a}</div>
              </div>
            ))}
          </div>

          <div id="contact" style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Contact us</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.7 }}>
              Email the team directly at{' '}
              <a href={`mailto:${EMAIL}`} style={{ color: 'var(--yellow)' }}>{EMAIL}</a> — we
              answer within 24 hours, usually much faster.
            </p>
          </div>

          <div id="report" style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Report a problem</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.7 }}>
              Found a bug or abusive content? Email{' '}
              <a href={`mailto:${EMAIL}?subject=REPORT`} style={{ color: 'var(--yellow)' }}>
                {EMAIL}
              </a>{' '}
              with the subject <b>REPORT</b>, including the page link and what happened. Abuse
              reports are actioned within 48 hours.
            </p>
          </div>

          <div id="copyright">
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Copyright</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.7 }}>
              JIG'SWurlD respects intellectual property. Artists may only upload work they own.
              If you believe content on this platform infringes your copyright, email{' '}
              <a href={`mailto:${EMAIL}?subject=DMCA`} style={{ color: 'var(--yellow)' }}>
                {EMAIL}
              </a>{' '}
              with the subject <b>DMCA</b>, including: the work you own, the link to the infringing
              track, and your contact details. Valid claims are removed promptly, and repeat
              infringers are terminated.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}