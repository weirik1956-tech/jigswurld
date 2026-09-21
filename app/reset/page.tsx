'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Mode = 'email' | 'sent' | 'password' | 'done'

export default function ResetPage() {
  const [mode, setMode] = useState<Mode>('email')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  /*
   * IMPORTANT:
   * We DO NOT use getSession() here.
   *
   * A normal logged-in session does NOT mean the user is
   * allowed to reset their password.
   *
   * We only show the new-password form when Supabase
   * confirms that a PASSWORD_RECOVERY event occurred.
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setMode('password')
        setMessage('')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  /*
   * Password strength
   */
  const passwordStrength = useMemo(() => {
    let score = 0

    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (!password) {
      return {
        score: 0,
        label: '',
      }
    }

    if (score <= 2) {
      return {
        score,
        label: 'Weak',
      }
    }

    if (score <= 4) {
      return {
        score,
        label: 'Good',
      }
    }

    return {
      score,
      label: 'Strong',
    }
  }, [password])

  const emailIsValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword

  /*
   * SEND PASSWORD RESET EMAIL
   */
  async function sendReset() {
    if (!emailIsValid) {
      setMessage('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/reset`,
          }
        )

      /*
       * We intentionally show the same message whether
       * the email exists or not.
       *
       * This prevents account/email enumeration.
       */
      if (error) {
        console.error('Password reset error:', error)
      }

      setMode('sent')
    } catch (error) {
      console.error('Password reset error:', error)

      /*
       * Keep the response neutral.
       */
      setMode('sent')
    } finally {
      setLoading(false)
    }
  }

  /*
   * UPDATE PASSWORD
   */
  async function updatePassword() {
    setMessage('')

    if (password.length < 8) {
      setMessage(
        'Your password must be at least 8 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setMessage(error.message)
        return
      }

      setPassword('')
      setConfirmPassword('')
      setMode('done')
    } catch (error) {
      console.error('Password update error:', error)

      setMessage(
        'Something went wrong. Please try the reset link again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '13px 15px',
    borderRadius: 10,
    border: '1px solid var(--line)',
    background: 'var(--bg-alt)',
    color: 'var(--text)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const passwordButtonStyle = {
    position: 'absolute' as const,
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    fontSize: 13,
    padding: 4,
  }

  return (
    <>
      {/* HEADER */}
      <header>
        <div className="wrap">
          <nav>
            <Link href="/" className="logo">
              JIG'S<span className="dot">Wurl</span>D
            </Link>

            <div className="nav-cta">
              <Link
                href="/login"
                className="btn btn-ghost"
              >
                Log in
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <div
          className="wrap"
          style={{
            maxWidth: 460,
            margin: '70px auto',
            padding: '0 20px',
          }}
        >
          {/* CARD */}
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: 18,
              padding: '32px',
              background: 'var(--bg)',
              boxShadow:
                '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            {/* ICON */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-alt)',
                border: '1px solid var(--line)',
                fontSize: 24,
                marginBottom: 20,
              }}
            >
              🔐
            </div>

            <div className="eyebrow">
              Account recovery
            </div>

            {/* ================================================= */}
            {/* STEP 1 — ENTER EMAIL */}
            {/* ================================================= */}

            {mode === 'email' && (
              <>
                <h1 style={{ marginBottom: 8 }}>
                  Forgot your password?
                </h1>

                <p
                  style={{
                    color: 'var(--text-dim)',
                    lineHeight: 1.6,
                    marginBottom: 24,
                  }}
                >
                  Enter the email address connected to
                  your JIG'SWurlD account and we'll send
                  you a secure password reset link.
                </p>

                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Email address
                </label>

                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setMessage('')
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      emailIsValid &&
                      !loading
                    ) {
                      sendReset()
                    }
                  }}
                  style={inputStyle}
                />

                {message && (
                  <p
                    style={{
                      color: 'var(--pink)',
                      fontSize: 13,
                      marginTop: 10,
                    }}
                  >
                    {message}
                  </p>
                )}

                <button
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    marginTop: 16,
                    justifyContent: 'center',
                    opacity:
                      loading || !emailIsValid
                        ? 0.6
                        : 1,
                  }}
                  onClick={sendReset}
                  disabled={
                    loading || !emailIsValid
                  }
                >
                  {loading
                    ? 'Sending...'
                    : 'Send password reset link'}
                </button>

                <div
                  style={{
                    textAlign: 'center',
                    marginTop: 20,
                    fontSize: 13,
                  }}
                >
                  <Link
                    href="/login"
                    style={{
                      color: 'var(--text-dim)',
                      textDecoration: 'none',
                    }}
                  >
                    ← Back to login
                  </Link>
                </div>
              </>
            )}

            {/* ================================================= */}
            {/* STEP 2 — EMAIL SENT */}
            {/* ================================================= */}

            {mode === 'sent' && (
              <>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-alt)',
                    border: '1px solid var(--line)',
                    fontSize: 27,
                    marginBottom: 20,
                  }}
                >
                  📬
                </div>

                <h1 style={{ marginBottom: 10 }}>
                  Check your inbox
                </h1>

                <p
                  style={{
                    color: 'var(--text-dim)',
                    lineHeight: 1.6,
                    marginBottom: 18,
                  }}
                >
                  If an account exists for this email,
                  we've sent a secure password reset link
                  to:
                </p>

                <div
                  style={{
                    padding: '13px 14px',
                    borderRadius: 10,
                    background: 'var(--bg-alt)',
                    border: '1px solid var(--line)',
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 20,
                    wordBreak: 'break-word',
                  }}
                >
                  {email}
                </div>

                <div
                  className="locked-note"
                  style={{
                    lineHeight: 1.6,
                    marginBottom: 18,
                  }}
                >
                  <strong>
                    📩 We've sent your reset link.
                  </strong>

                  <br />
                  <br />

                  Open your email and click{' '}
                  <strong>
                    "Reset Password"
                  </strong>{' '}
                  to continue.

                  <br />
                  <br />

                  You will only be able to create a new
                  password after opening the secure link
                  from your email.
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-dim)',
                    lineHeight: 1.6,
                  }}
                >
                  Didn't receive the email? Check your
                  spam or junk folder. You can also try
                  again after a few moments.
                </p>

                <button
                  className="btn btn-ghost"
                  style={{
                    width: '100%',
                    marginTop: 18,
                    justifyContent: 'center',
                  }}
                  onClick={() => {
                    setMode('email')
                    setMessage('')
                  }}
                >
                  Try another email
                </button>
              </>
            )}

            {/* ================================================= */}
            {/* STEP 3 — NEW PASSWORD */}
            {/* ================================================= */}

            {mode === 'password' && (
              <>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-alt)',
                    border: '1px solid var(--line)',
                    fontSize: 27,
                    marginBottom: 20,
                  }}
                >
                  🔓
                </div>

                <h1 style={{ marginBottom: 8 }}>
                  Create a new password
                </h1>

                <p
                  style={{
                    color: 'var(--text-dim)',
                    lineHeight: 1.6,
                    marginBottom: 24,
                  }}
                >
                  Your password reset link has been
                  verified. You can now create a new
                  password for your JIG'SWurlD account.
                </p>

                {/* NEW PASSWORD */}

                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  New password
                </label>

                <div
                  style={{
                    position: 'relative',
                  }}
                >
                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    placeholder="Enter a new password"
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setMessage('')
                    }}
                    style={{
                      ...inputStyle,
                      paddingRight: 65,
                    }}
                  />

                  <button
                    type="button"
                    style={passwordButtonStyle}
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                  >
                    {showPassword
                      ? 'Hide'
                      : 'Show'}
                  </button>
                </div>

                {/* PASSWORD STRENGTH */}

                {password && (
                  <div
                    style={{
                      marginTop: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: 5,
                        marginBottom: 6,
                      }}
                    >
                      {[1, 2, 3, 4, 5].map(
                        (level) => (
                          <div
                            key={level}
                            style={{
                              height: 4,
                              flex: 1,
                              borderRadius: 5,
                              background:
                                level <=
                                passwordStrength.score
                                  ? 'var(--accent)'
                                  : 'var(--line)',
                            }}
                          />
                        )
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color:
                          'var(--text-dim)',
                      }}
                    >
                      Password strength:{' '}
                      <strong>
                        {
                          passwordStrength.label
                        }
                      </strong>
                    </div>
                  </div>
                )}

                {/* CONFIRM PASSWORD */}

                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 18,
                    marginBottom: 8,
                  }}
                >
                  Confirm new password
                </label>

                <div
                  style={{
                    position: 'relative',
                  }}
                >
                  <input
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    placeholder="Enter your password again"
                    value={confirmPassword}
                    autoComplete="new-password"
                    onChange={(e) => {
                      setConfirmPassword(
                        e.target.value
                      )
                      setMessage('')
                    }}
                    style={{
                      ...inputStyle,
                      paddingRight: 65,
                    }}
                  />

                  <button
                    type="button"
                    style={passwordButtonStyle}
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    {showConfirmPassword
                      ? 'Hide'
                      : 'Show'}
                  </button>
                </div>

                {confirmPassword && (
                  <p
                    style={{
                      fontSize: 12,
                      marginTop: 8,
                      color: passwordsMatch
                        ? 'var(--accent)'
                        : 'var(--pink)',
                    }}
                  >
                    {passwordsMatch
                      ? '✓ Passwords match'
                      : 'Passwords do not match'}
                  </p>
                )}

                {message && (
                  <p
                    style={{
                      color: 'var(--pink)',
                      fontSize: 13,
                      marginTop: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    {message}
                  </p>
                )}

                <button
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    marginTop: 18,
                    justifyContent: 'center',
                    opacity:
                      loading ||
                      password.length < 8 ||
                      !passwordsMatch
                        ? 0.6
                        : 1,
                  }}
                  onClick={updatePassword}
                  disabled={
                    loading ||
                    password.length < 8 ||
                    !passwordsMatch
                  }
                >
                  {loading
                    ? 'Updating password...'
                    : 'Update password'}
                </button>

                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-dim)',
                    lineHeight: 1.6,
                    marginTop: 18,
                  }}
                >
                  🔒 Your password is securely handled
                  by Supabase authentication.
                </p>
              </>
            )}

            {/* ================================================= */}
            {/* STEP 4 — DONE */}
            {/* ================================================= */}

            {mode === 'done' && (
              <>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-alt)',
                    border: '1px solid var(--line)',
                    fontSize: 28,
                    marginBottom: 20,
                  }}
                >
                  ✓
                </div>

                <h1 style={{ marginBottom: 10 }}>
                  Password updated!
                </h1>

                <p
                  style={{
                    color: 'var(--text-dim)',
                    lineHeight: 1.6,
                    marginBottom: 24,
                  }}
                >
                  Your password has been changed
                  successfully. You can now sign in to
                  your JIG'SWurlD account using your new
                  password.
                </p>

                <Link
                  href="/login"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  Continue to login
                </Link>
              </>
            )}
          </div>

          {/* SECURITY MESSAGE */}

          {mode !== 'done' && (
            <p
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text-dim)',
                marginTop: 20,
                lineHeight: 1.6,
              }}
            >
              🔐 JIG'SWurlD will never ask you for
              your password through email.
            </p>
          )}
        </div>
      </main>
    </>
  )
}