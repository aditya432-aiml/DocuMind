'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { AuthFormMessage } from './AuthFormMessage'
import { createAccount, signIn } from '@/lib/auth'

type ModalType = 'login' | 'signup' | null

interface AuthModalProps {
  open: ModalType
  onClose: () => void
  onSwitch: (t: 'login' | 'signup') => void
}

export function AuthModal({ open, onClose, onSwitch }: AuthModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isLogin = open === 'login'
  const isSignup = open === 'signup'

  useEffect(() => {
    setError(null)
    setIsSubmitting(false)
  }, [open])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      await signIn(email, password)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '')
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      await createAccount(name, email, password)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Login */}
      <div
        ref={overlayRef}
        className={`dm-overlay${isLogin ? ' open' : ''}`}
        onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
        aria-modal="true"
        role="dialog"
        aria-label="Login"
      >
        <div className="dm-modal">
          <button className="dm-modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
          <h2 className="dm-modal-title">Welcome back</h2>
          <p className="dm-modal-sub">Sign in to your DocuMind account</p>
          <form onSubmit={handleLogin}>
            <AuthFormMessage message={error} />
            <div className="form-row">
              <label htmlFor="l-email">Email address</label>
              <input id="l-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </div>
            <div className="form-row">
              <label htmlFor="l-pass">Password</label>
              <input id="l-pass" name="password" type="password" placeholder="Your password" autoComplete="current-password" required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="dm-modal-foot">
            No account?{' '}
            <button className="dm-link" onClick={() => onSwitch('signup')}>
              Sign up free →
            </button>
          </p>
        </div>
      </div>

      {/* Signup */}
      <div
        className={`dm-overlay${isSignup ? ' open' : ''}`}
        onClick={(e) => { if ((e.target as HTMLElement).classList.contains('dm-overlay')) onClose() }}
        aria-modal="true"
        role="dialog"
        aria-label="Sign up"
      >
        <div className="dm-modal">
          <button className="dm-modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
          <h2 className="dm-modal-title">Create your account</h2>
          <p className="dm-modal-sub">Free forever — no credit card needed</p>
          <form onSubmit={handleSignup}>
            <AuthFormMessage message={error} />
            <div className="form-row">
              <label htmlFor="s-name">Full name</label>
              <input id="s-name" name="name" type="text" placeholder="Your name" autoComplete="name" required />
            </div>
            <div className="form-row">
              <label htmlFor="s-email">Email address</label>
              <input id="s-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </div>
            <div className="form-row">
              <label htmlFor="s-pass">Password</label>
              <input id="s-pass" name="password" type="password" placeholder="Create a password" autoComplete="new-password" minLength={8} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create free account'}
            </button>
          </form>
          <p className="dm-modal-foot">
            Already have an account?{' '}
            <button className="dm-link" onClick={() => onSwitch('login')}>
              Sign in →
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .dm-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: oklch(0 0 0 / 0.65); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; pointer-events: none; transition: opacity 0.2s;
          padding: 24px;
        }
        .dm-overlay.open { opacity: 1; pointer-events: all; }
        .dm-modal {
          position: relative; background: var(--surf); border: 1px solid var(--bdr);
          border-radius: 20px; padding: 36px; width: min(460px, 100%);
          transform: translateY(16px) scale(0.98); transition: transform 0.25s;
          box-shadow: 0 40px 80px oklch(0 0 0 / 0.4);
        }
        .dm-overlay.open .dm-modal { transform: translateY(0) scale(1); }
        .dm-modal-close {
          position: absolute; top: 14px; right: 14px;
          width: 30px; height: 30px; border-radius: 7px;
          background: var(--surf2); border: 1px solid var(--bdr);
          cursor: pointer; color: var(--txt2);
          display: flex; align-items: center; justify-content: center;
          transition: color 0.15s;
        }
        .dm-modal-close:hover { color: var(--txt); }
        .dm-modal-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 5px; }
        .dm-modal-sub { color: var(--txt2); font-size: 14px; margin-bottom: 26px; }
        .dm-modal-foot { margin-top: 20px; text-align: center; font-size: 14px; color: var(--txt2); }
        .dm-link {
          background: none; border: none; cursor: pointer;
          color: var(--acc); font-size: inherit; font-family: inherit; padding: 0;
        }
        .dm-link:hover { text-decoration: underline; }
      `}</style>
    </>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
