import Link from 'next/link'
import { LogoMark } from './LogoMark'

export function Footer() {
  return (
    <footer className="dm-footer">
      <div className="container">
        <div className="foot-main">
          <div className="foot-brand">
            <Link href="/" className="dm-logo">
              <LogoMark />
              DocuMind
            </Link>
            <p>AI agents that answer questions about your documents, instantly and for free.</p>
          </div>

          <div className="foot-links">
            <div className="link-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How it Works</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="link-col">
              <h4>Company</h4>
              <Link href="/legal">Legal</Link>
            </div>
          </div>
        </div>

        <div className="foot-bottom">
          <span className="foot-copy">© {new Date().getFullYear()} DocuMind. All rights reserved.</span>
          <span className="foot-copy">Made for document lovers everywhere.</span>
        </div>
      </div>

      <style>{`
        .dm-footer { border-top: 1px solid var(--bdr); padding: 48px 0; }
        .dm-logo {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700; font-size: 18px; letter-spacing: -0.02em; width: fit-content;
        }
        .foot-main {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 32px; flex-wrap: wrap; margin-bottom: 36px;
        }
        .foot-brand p {
          color: var(--txt2); font-size: 13.5px; margin-top: 10px;
          max-width: 220px; line-height: 1.6;
        }
        .foot-links { display: flex; gap: 48px; }
        .link-col h4 {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--txt2); margin-bottom: 14px;
        }
        .link-col a {
          display: block; color: var(--txt2); font-size: 14px;
          margin-bottom: 9px; transition: color 0.15s;
        }
        .link-col a:hover { color: var(--txt); }
        .foot-bottom {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 28px; border-top: 1px solid var(--bdr);
          flex-wrap: wrap; gap: 12px;
        }
        .foot-copy { color: var(--txt2); font-size: 13px; }
      `}</style>
    </footer>
  )
}
