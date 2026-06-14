const features = [
  {
    title: 'Instant Q&A',
    desc: 'Ask questions in natural language. Get immediate, accurate answers grounded in your document content.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 7v4M10 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Smart Extraction',
    desc: 'Key entities, dates, figures, and clauses are automatically surfaced — no manual scanning required.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
        <path d="M4 10l5 5 7-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Multi-doc Support',
    desc: 'Upload multiple PDFs and query across all of them — perfect for comparing contracts or cross-referencing reports.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
        <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10h6M7 7h6M7 13h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Conversation Memory',
    desc: 'Ask follow-up questions naturally. DocuMind maintains full context throughout your entire session.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
        <path d="M4 6h12M4 10h8M4 14h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Privacy First',
    desc: 'Your documents are encrypted and never used for model training or shared with any third party.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
        <path d="M10 2L4 5v6c0 4 4 6.5 6 7.5 2-1 6-3.5 6-7.5V5l-6-3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Export Answers',
    desc: 'Save your insights as markdown or plain text — easy to paste into reports, notes, or emails.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
        <path d="M10 3v11M10 14l-4-4M10 14l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 17h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="tag">Features</div>
        <h2 className="section-title">
          Everything you need<br />to understand your docs
        </h2>
        <p className="section-desc">Powerful AI capabilities packed into a simple interface.</p>

        <div className="feat-grid">
          {features.map((f) => (
            <div key={f.title} className="feat-card">
              <div className="feat-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .feat-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
        }
        .feat-card {
          background: var(--surf); border: 1px solid var(--bdr);
          border-radius: 14px; padding: 26px;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .feat-card:hover {
          border-color: var(--acc3); transform: translateY(-3px);
          box-shadow: 0 10px 36px var(--acc2);
        }
        .feat-icon {
          width: 42px; height: 42px; border-radius: 10px;
          background: var(--acc2); display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px; color: var(--acc);
        }
        .feat-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 7px; }
        .feat-card p { color: var(--txt2); font-size: 13.5px; line-height: 1.6; }
        @media (max-width: 860px) {
          .feat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 540px) {
          .feat-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}
