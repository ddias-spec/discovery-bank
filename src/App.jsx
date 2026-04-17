import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { validateDomain } from './Auth'
import Auth from './Auth'
import DiscoveryTile from './DiscoveryTile'
import { CSS, I } from './DiscoveryTile'

const ALLOWED_DOMAINS = ['squareup.com', 'block.xyz']

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [domainError, setDomainError] = useState(false)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('db-theme') || 'dark' } catch { return 'dark' }
  })

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem('db-theme', next) } catch {}
      return next
    })
  }

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const domain = session.user.email?.split('@')[1]
        if (ALLOWED_DOMAINS.includes(domain)) {
          setSession(session)
        } else {
          setDomainError(true)
          supabase.auth.signOut()
        }
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const domain = session.user.email?.split('@')[1]
        if (ALLOWED_DOMAINS.includes(domain)) {
          setSession(session)
          setDomainError(false)
        } else {
          setDomainError(true)
          supabase.auth.signOut()
          setSession(null)
        }
      } else {
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div data-theme={theme} style={{
        fontFamily: "'Outfit', -apple-system, sans-serif",
        background: "var(--bg)", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text2)", fontSize: 14,
      }}>
        <style>{CSS}</style>
        Loading…
      </div>
    )
  }

  // Not authenticated — show login
  if (!session) {
    return (
      <div data-theme={theme}>
        <style>{CSS}</style>
        <Auth theme={theme} toggleTheme={toggleTheme} I={I} />
        {domainError && (
          <div style={{
            position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
            background: "var(--pain-bg)", border: "1px solid var(--pain-border)",
            borderRadius: 10, padding: "12px 20px", fontSize: 13, color: "var(--red)",
            backdropFilter: "blur(20px)", zIndex: 100, maxWidth: 360, textAlign: "center",
          }}>
            Access restricted to @squareup.com and @block.xyz accounts only.
          </div>
        )}
      </div>
    )
  }

  // Authenticated — show the app
  return <DiscoveryTile session={session} theme={theme} toggleTheme={toggleTheme} />
}
