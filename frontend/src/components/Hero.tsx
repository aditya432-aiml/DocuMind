'use client'

import { useAuthModal } from './AuthModalContext'

export function Hero() {
  const { openLogin, openSignup } = useAuthModal()

  return (
    <div className="container">
      <section className="hero-section">
        {/* Left: Copy */}
        <div className="hero-copy">
          <div className="badge">
            <span className="badge-dot" />
            AI-powered document Q&amp;A
          </div>
          <h1>
            Ask anything about<br />
            <span className="hero-hl">your documents</span>
          </h1>
          <p className="hero-desc">
            Drop a PDF. DocuMind&apos;s AI agents read, understand, and answer
            your questions in seconds — no setup, no training required.
          </p>
          <div className="hero-ctas">
            <button className="btn btn-primary btn-lg" onClick={openSignup}>
              Get started — it&apos;s free
            </button>
            <button className="btn btn-ghost btn-lg" onClick={openLogin}>
              Log in
            </button>
          </div>
          <p className="hero-note">
            Free forever &nbsp;·&nbsp; No credit card required &nbsp;·&nbsp; Works on any PDF
          </p>
        </div>

        {/* Right: App Mockup */}
        <div className="mockup-wrap">
          <div className="mockup-glow" />
          <div className="app-shell">
            <div className="app-bar">
              <span className="dot dr" /><span className="dot dy" /><span className="dot dg" />
              <span className="bar-title">DocuMind</span>
            </div>
            <div className="app-body">
              <div className="app-sidebar">
                <div className="sidebar-hd">Documents</div>
                {['annual_report.pdf', 'contract_q3.pdf', 'tos_2025.pdf'].map((name, i) => (
                  <div key={name} className={`doc-row${i === 1 ? ' active' : ''}`}>
                    <FileIcon />
                    {name}
                  </div>
                ))}
              </div>
              <div className="chat-area">
                <div className="chat-msgs">
                  <div className="msg u">What is the notice period?</div>
                  <div className="msg a">
                    <div className="ai-tag">DOCUMIND AI</div>
                    The notice period is <strong>30 days</strong>, per Clause 4.2. Either party
                    must provide written notice to terminate.
                  </div>
                  <div className="msg u">Is there an early termination penalty?</div>
                </div>
                <div className="chat-input-row">
                  <input className="chat-inp" placeholder="Ask anything about your document…" readOnly />
                  <button className="send-btn">
                    <SendIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .hero-section {
          padding: 100px 0 80px;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 80px; align-items: center;
        }
        .badge {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--acc2); border: 1px solid var(--acc3);
          color: var(--acc); border-radius: 100px;
          padding: 5px 14px; font-size: 12.5px; font-weight: 600; margin-bottom: 22px;
        }
        .badge-dot { width: 6px; height: 6px; background: var(--acc); border-radius: 50%; flex-shrink: 0; }
        .hero-section h1 {
          font-size: clamp(36px, 4.5vw, 58px); font-weight: 700;
          line-height: 1.07; letter-spacing: -0.03em; margin-bottom: 20px;
        }
        .hero-hl { color: var(--acc); }
        .hero-desc {
          color: var(--txt2); font-size: 17px; line-height: 1.7;
          max-width: 460px; margin-bottom: 36px;
        }
        .hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .hero-note { margin-top: 14px; color: var(--txt2); font-size: 13px; }
        /* Mockup */
        .mockup-wrap { position: relative; }
        .mockup-glow {
          position: absolute; inset: -40px;
          background: radial-gradient(ellipse at 50% 40%, var(--acc2), transparent 65%);
          pointer-events: none;
        }
        .app-shell {
          position: relative; z-index: 1;
          background: var(--surf); border: 1px solid var(--bdr);
          border-radius: 16px; overflow: hidden; box-shadow: var(--shd);
        }
        .app-bar {
          display: flex; align-items: center; gap: 6px; padding: 12px 16px;
          background: var(--surf2); border-bottom: 1px solid var(--bdr);
        }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dr { background: #ff6057; } .dy { background: #ffbd2e; } .dg { background: #27c840; }
        .bar-title {
          margin: 0 auto; font-size: 12px; font-weight: 500; color: var(--txt2);
          font-family: var(--font-dm-mono, "SFMono-Regular", Consolas, "Liberation Mono", monospace);
        }
        .app-body { display: flex; height: 340px; }
        .app-sidebar { width: 168px; border-right: 1px solid var(--bdr); padding: 10px; flex-shrink: 0; }
        .sidebar-hd {
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--txt2); padding: 8px 6px 6px;
        }
        .doc-row {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 8px; border-radius: 7px;
          font-size: 11.5px; color: var(--txt2); cursor: pointer;
          transition: all 0.12s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .doc-row:hover { background: var(--surf2); color: var(--txt); }
        .doc-row.active { background: var(--acc2); color: var(--acc); }
        .chat-area { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .chat-msgs { flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 10px; overflow: hidden; }
        .msg { max-width: 88%; padding: 9px 13px; border-radius: 10px; font-size: 12.5px; line-height: 1.5; }
        .msg.u { background: var(--acc); color: #fff; align-self: flex-end; border-radius: 10px 10px 2px 10px; }
        .msg.a { background: var(--surf2); color: var(--txt); align-self: flex-start; border-radius: 10px 10px 10px 2px; }
        .ai-tag { font-size: 9px; font-weight: 700; color: var(--acc); letter-spacing: 0.08em; margin-bottom: 3px; }
        .chat-input-row { padding: 10px; border-top: 1px solid var(--bdr); display: flex; gap: 7px; }
        .chat-inp {
          flex: 1; background: var(--surf2); border: 1px solid var(--bdr);
          border-radius: 8px; padding: 8px 12px; font-size: 12px;
          color: var(--txt2); font-family: inherit; outline: none;
        }
        .send-btn {
          width: 32px; height: 32px; border-radius: 7px; background: var(--acc);
          border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        @media (max-width: 800px) {
          .hero-section { grid-template-columns: 1fr; gap: 48px; padding: 64px 0 48px; }
          .mockup-wrap { display: none; }
        }
      `}</style>
    </div>
  )
}

function FileIcon() {
  return (
    <svg viewBox="0 0 13 13" fill="none" width="13" height="13" style={{ flexShrink: 0 }}>
      <path d="M1.5 1.5h6l3 3v7h-9v-10z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 7h11M7 1.5L12.5 7 7 12.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
