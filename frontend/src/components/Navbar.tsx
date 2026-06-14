'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { useAuthModal } from './AuthModalContext'
import { LogoMark } from './LogoMark'
import { AUTH_CHANGED_EVENT, AuthUser, getStoredUser, signOut } from '@/lib/auth'

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const { openLogin, openSignup } = useAuthModal()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getStoredUser())

    const syncUser = () => setUser(getStoredUser())
    window.addEventListener(AUTH_CHANGED_EVENT, syncUser)
    window.addEventListener('storage', syncUser)

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncUser)
      window.removeEventListener('storage', syncUser)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const initials = user ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : ''

  return (
    <nav className="dm-nav">
      <div className="container">
        <div className="dm-nav-inner">
          <Link href="/" className="dm-logo">
            <LogoMark />
            DocuMind
          </Link>

          {!user && (
            <ul className="dm-nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          )}

          <div className="dm-nav-actions">
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <ThemeIcon />
            </button>
            {user ? (
              <div className="user-menu" ref={menuRef}>
                <button
                  className="avatar-btn"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="Open user menu"
                >
                  {initials}
                </button>
                {menuOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <span>{user.name}</span>
                      <small>{user.email}</small>
                    </div>
                    <Link href="/settings" className="dropdown-link" onClick={() => setMenuOpen(false)}>
                      Settings
                    </Link>
                    <button className="dropdown-link" onClick={() => { signOut(); setMenuOpen(false) }}>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={openLogin}>Log in</button>
                <button className="btn btn-primary" onClick={openSignup}>Sign up free</button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .dm-nav {
          position: sticky; top: 0; z-index: 100;
          background: var(--bg); border-bottom: 1px solid var(--bdr);
          transition: background 0.3s, border-color 0.3s;
        }
        .dm-nav-inner {
          display: flex; align-items: center; height: 64px; gap: 8px;
        }
        .dm-logo {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700; font-size: 18px; letter-spacing: -0.02em;
          flex-shrink: 0; margin-right: auto;
        }
        .dm-nav-links {
          display: flex; gap: 2px; list-style: none; margin: 0 20px;
        }
        .dm-nav-links a {
          color: var(--txt2); font-size: 14px; font-weight: 500;
          padding: 6px 12px; border-radius: 7px; transition: all 0.15s;
        }
        .dm-nav-links a:hover { color: var(--txt); background: var(--surf2); }
        .dm-nav-actions { display: flex; align-items: center; gap: 8px; position: relative; }
        .avatar-btn {
          width: 38px; height: 38px; border-radius: 999px;
          border: 1px solid var(--bdr); background: var(--surf2);
          color: var(--txt); font-weight: 700; display: inline-flex;
          align-items: center; justify-content: center; cursor: pointer;
        }
        .user-menu { position: relative; }
        .user-dropdown {
          position: absolute; right: 0; top: 48px;
          min-width: 180px; background: var(--surf); border: 1px solid var(--bdr);
          border-radius: 18px; box-shadow: var(--shd); padding: 14px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .dropdown-header {
          border-bottom: 1px solid var(--bdr); padding-bottom: 10px;
        }
        .dropdown-header span { display: block; font-weight: 700; }
        .dropdown-header small { color: var(--txt2); font-size: 12px; }
        .dropdown-link {
          width: 100%; text-align: left; border: none; background: none;
          padding: 10px 0; color: var(--txt); font-size: 14px; cursor: pointer;
        }
        .dropdown-link:hover { color: var(--acc); }
        @media (max-width: 640px) {
          .dm-nav-links { display: none; }
        }
      `}</style>
    </nav>
  )
}

function ThemeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.41 1.41M11.37 11.37l1.41 1.41M11.37 4.63l1.41-1.41M3.22 12.78l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
