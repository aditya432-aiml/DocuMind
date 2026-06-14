import Link from 'next/link'
import { LogoMark } from '@/components/LogoMark'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <LogoMark />
          DocuMind
        </Link>

        <h1>Welcome back</h1>
        <p className="auth-sub">Sign in to your DocuMind account</p>

        <LoginForm />

        <p className="auth-foot">
          No account?{' '}
          <Link href="/signup" className="auth-link">
            Sign up free →
          </Link>
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh; background: var(--bg);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 24px;
        }
        .auth-card {
          background: var(--surf); border: 1px solid var(--bdr);
          border-radius: 20px; padding: 40px; width: min(460px, 100%);
          box-shadow: var(--shd);
        }
        .auth-logo {
          display: inline-flex; align-items: center; gap: 10px;
          font-weight: 700; font-size: 18px; letter-spacing: -0.02em;
          margin-bottom: 28px;
        }
        .auth-card h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 5px; }
        .auth-sub { color: var(--txt2); font-size: 14px; margin-bottom: 26px; }
        .auth-foot { margin-top: 20px; text-align: center; font-size: 14px; color: var(--txt2); }
        .auth-link { color: var(--acc); }
        .auth-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
