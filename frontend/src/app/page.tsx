'use client'

import { useEffect, useState, useRef } from 'react'
import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { Features } from '@/components/Features'
import { FAQ } from '@/components/FAQ'
import { Footer } from '@/components/Footer'
import { AuthModalProvider } from '@/components/AuthModalContext'
import { ChatApp } from '@/components/ChatApp'
import { AUTH_CHANGED_EVENT, getLogoutMessage, getStoredUser, getStoredToken, isTokenExpiringSoon, refreshToken } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const userRef = useRef<AuthUser | null>(null)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    const initialUser = getStoredUser()
    setSessionMessage(getLogoutMessage())
    setUser(initialUser)
    userRef.current = initialUser

    const syncAuth = () => {
      const current = getStoredUser()
      if (userRef.current && !current) {
        // Transitioned from logged in to logged out
        setSessionMessage(getLogoutMessage() ?? 'Your session has expired. Please sign in again.')
      } else if (!userRef.current && current) {
        // Transitioned from logged out to logged in
        setSessionMessage(null)
      }

      // Check if token is expiring soon (within 10 minutes) and refresh it silently
      const token = getStoredToken()
      if (current && token && isTokenExpiringSoon(token, 10)) {
        refreshToken().catch((err) => console.error('Silent refresh failed:', err))
      }

      setUser(current)
    }

    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth)
    window.addEventListener('storage', syncAuth)

    const interval = setInterval(syncAuth, 10000)

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth)
      window.removeEventListener('storage', syncAuth)
      clearInterval(interval)
    }
  }, [])

  return (
    <AuthModalProvider>
      {!user && <Navbar />}
      {sessionMessage && (
        <div className={`session-banner ${sessionMessage.toLowerCase().includes('success') ? 'success' : 'error'}`}>
          {sessionMessage}
        </div>
      )}
      <main>
        {user ? (
          <ChatApp user={user} />
        ) : (
          <>
            <Hero />
            <HowItWorks />
            <Features />
            <FAQ />
          </>
        )}
      </main>
      {!user && <Footer />}
      <style jsx>{`
        .session-banner {
          position: sticky;
          top: 88px;
          margin: 0 24px 18px;
          padding: 14px 18px;
          border-radius: 16px;
          background: rgba(220, 38, 38, 0.12);
          color: #f87171;
          border: 1px solid rgba(220, 38, 38, 0.18);
          max-width: calc(100% - 48px);
          z-index: 10;
        }
        .session-banner.success {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.18);
        }
        @media (max-width: 720px) {
          .session-banner { top: 70px; margin: 0 16px 16px; }
        }
      `}</style>
    </AuthModalProvider>
  )
}

