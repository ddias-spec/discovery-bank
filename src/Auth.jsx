import { useState } from 'react'
import { supabase } from './supabaseClient'

const ALLOWED_DOMAINS = ['squareup.com', 'block.xyz']

export default function Auth({ theme, toggleTheme, I }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          hd: 'squareup.com', // Hints Google to show only Square accounts
        },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      fontFamily: "var(--font)", background: "var(--bg)", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px", color: "var(--text)", position: "relative", overflow: "hidden",
    }}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
        style={{
          position: "fixed", top: 20, right: 20, zIndex: 10,
          width: 38, height: 38, borderRadius: 11,
          border: "1px solid var(--glass-border)", background: "var(--glass)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text2)", padding: 0, transition: "all .3s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.borderColor = "var(--glass-border)"; }}
      >
        {theme === "dark" ? <I.Sun /> : <I.Moon />}
      </button>

      {/* Orbs */}
      <div style={{ position: "fixed", top: "-10%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, var(--orb) 0%, transparent 70%)", animation: "float-orb 20s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, var(--orb) 0%, transparent 70%)", animation: "float-orb 25s ease-in-out infinite reverse", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 400, width: "100%", animation: "fadeUp 0.5s ease" }}>
        {/* Block logo */}
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 14, background: "var(--logo-bg)", marginBottom: 20 }}>
          <svg width="34" height="34" viewBox="0 0 28 28" fill="none">
            {[3,11,19].map(y => [3,11,19].map(x => (
              <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.5" fill="var(--logo-fill)" />
            )))}
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 8 }}>Discovery Bank</h1>
        <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 32, lineHeight: 1.5 }}>
          Sign in with your Square or Block account to get started.
        </p>

        {error && (
          <div style={{
            background: "var(--pain-bg)", border: "1px solid var(--pain-border)",
            borderRadius: 10, padding: "12px 16px", marginBottom: 20,
            fontSize: 13, color: "var(--red)", textAlign: "left",
          }}>
            {error}
          </div>
        )}

        {/* Google sign-in button */}
        <button onClick={handleGoogleLogin} disabled={loading}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            width: "100%", padding: "14px 24px",
            background: "var(--glass)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: 12,
            color: "var(--text)", fontSize: 15, fontWeight: 600, fontFamily: "var(--font)",
            cursor: loading ? "wait" : "pointer", transition: "all .3s",
            opacity: loading ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 20px var(--accent-glow)"; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          {/* Google icon */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 20, lineHeight: 1.6 }}>
          Restricted to @squareup.com and @block.xyz accounts
        </p>

        <div style={{ marginTop: 40, fontSize: 11, color: "var(--credit)", fontWeight: 700, letterSpacing: "0.03em" }}>
          Created by Damani Joseph Dias
        </div>
      </div>
    </div>
  )
}

// Domain validation — call this after auth callback to verify
export async function validateDomain(session) {
  if (!session?.user?.email) return false
  const domain = session.user.email.split('@')[1]
  if (!ALLOWED_DOMAINS.includes(domain)) {
    await supabase.auth.signOut()
    return false
  }
  return true
}
