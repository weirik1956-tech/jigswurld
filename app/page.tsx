import Link from 'next/link'

export default function Home() {
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
              <Link href="/login?mode=login" className="btn btn-ghost">Log in</Link>
              <Link href="/login?mode=signup" className="btn btn-primary">Sign up</Link>
            </div>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <div className="eyebrow">Now boarding independent artists</div>
              <h1>
                Where artists get heard,
                <br />
                <span className="accent">not buried.</span>
              </h1>
              <p className="lead">
                Upload your music, keep your masters, and build a direct line to the fans who
                actually show up — with real analytics, tips, and a discovery engine that
                doesn't bury you under playlist politics.
              </p>
              <div className="hero-actions">
                <Link href="/login" className="btn btn-primary">
                  Start Uploading — It's Free
                </Link>
                <Link href="/discover" className="btn btn-ghost">
                  <span className="eq playing">
                    <span></span><span></span><span></span><span></span><span></span><span></span>
                  </span>
                  Explore the catalog
                </Link>
              </div>
              <div className="hero-stats">
                <div><span className="num">0%</span><span className="label">Master ownership lost</span></div>
                <div><span className="num">100%</span><span className="label">Tips go to the artist</span></div>
                <div><span className="num">&lt;5 min</span><span className="label">To release a track</span></div>
              </div>
            </div>

            <div className="player-card">
              <div className="art">
                <span className="eq playing">
                  <span></span><span></span><span></span><span></span><span></span><span></span>
                </span>
              </div>
              <div className="track-meta">
                <div>
                  <h4>Concrete Bloom</h4>
                  <p>Nadia Vex — Independent</p>
                </div>
                <span className="live">Live</span>
              </div>
              <div className="progress"><i style={{ width: '38%' }}></i></div>
              <div className="time-row"><span>1:22</span><span>3:41</span></div>
              <div className="floating-tip">
                <span className="pill">+$5</span>
                <span>Tip sent to Nadia Vex</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
