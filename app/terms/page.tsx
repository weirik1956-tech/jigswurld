import Link from 'next/link'

export const metadata = {
  title: "Terms & Conditions — JIG'SWurlD",
}

const sections = [
  {
    h: '1. Your music, your masters',
    p: "You keep 100% ownership of every track you upload to JIG'SWurlD. We claim no rights to your masters, publishing, or royalties. By uploading, you grant us only the technical permission needed to stream your music to listeners on the platform.",
  },
  {
    h: '2. Tips & payments',
    p: "Tips are processed by Stripe. JIG'SWurlD takes 0% of any tip; however, Stripe's standard processing fees apply and are deducted by Stripe at checkout. Payouts to artists follow the Stripe account setup chosen by the artist.",
  },
  {
    h: '3. Only upload what you own',
    p: "You may only upload audio, artwork, and lyrics that you created or fully own the rights to. No stolen beats, no unauthorized samples, no re-uploads of other artists' work. We reserve the right to remove any content that breaks this rule and to suspend accounts that repeat it.",
  },
  {
    h: '4. Fair use of the platform',
    p: "No spam uploads, no artificial play inflation, no harassment of other users, no illegal content. JIG'SWurlD is a community built for independent artists and the fans who support them — protect it.",
  },
  {
    h: '5. Beta service',
    p: "JIG'SWurlD is currently in beta. Features may change, and rare outages can happen. We work hard to keep your music and data safe, but the service is provided as-is while we build toward v1.",
  },
  {
    h: '6. Accounts & termination',
    p: 'You are responsible for keeping your login details safe. We may suspend or terminate accounts that violate these terms. You may delete your account and withdraw your catalog at any time by contacting us.',
  },
  {
    h: '7. Changes to these terms',
    p: "As the platform grows, these terms may be updated. Continued use of JIG'SWurlD after an update means you accept the new terms. Last updated: September 20, 2026.",
  },
]

export default function TermsPage() {
  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <Link href="/" className="logo">
              JIG'S<span className="dot">Wurl</span>D
            </Link>
            <div className="nav-cta">
              <Link href="/login" className="btn btn-ghost">Log in</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap" style={{ maxWidth: 720, margin: '60px auto', padding: '0 20px 120px' }}>
          <div className="eyebrow">Legal</div>
          <h1 style={{ marginBottom: 6 }}>Terms & Conditions</h1>
          <p style={{ color: 'var(--text-dim)', marginBottom: 28 }}>
            The simple, honest rules of JIG'SWurlD — written for artists, not against them.
          </p>
          {sections.map((s) => (
            <div key={s.h} style={{ marginBottom: 22 }}>
              <h3 style={{ marginBottom: 6 }}>{s.h}</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.7 }}>{s.p}</p>
            </div>
          ))}
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Questions? Email the team any time — we answer fast.{' '}
            <Link href="/" style={{ color: 'var(--yellow)' }}>Back home</Link>
          </p>
        </div>
      </main>
    </>
  )
}