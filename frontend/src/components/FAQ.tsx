'use client'

import { useState } from 'react'

const faqs = [
  {
    q: 'Is DocuMind really free?',
    a: 'Yes — DocuMind is completely free to use. No credit card, no hidden charges, no usage caps. Sign up and start immediately.',
  },
  {
    q: 'What file types are supported?',
    a: 'DocuMind currently supports PDF files. Support for Word (.docx), spreadsheets, and plain text is on the roadmap.',
  },
  {
    q: 'How accurate are the answers?',
    a: "DocuMind answers strictly from your document's content and cites the source section so you can verify. Hallucinations are minimized by design.",
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. Documents are encrypted in transit and at rest, never shared with third parties, and never used to train AI models. Delete your data at any time.',
  },
  {
    q: 'Can I ask follow-up questions?',
    a: "Yes. DocuMind keeps the full context of your session, so follow-ups feel natural — just like chatting with a colleague who's read every page.",
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i)

  return (
    <section className="section section-alt" id="faq">
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="tag">FAQ</div>
        <h2 className="section-title">Frequently asked questions</h2>
        <p className="section-desc" style={{ margin: '0 auto' }}>
          Everything you need to know about DocuMind.
        </p>

        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className={`faq-item${openIndex === i ? ' open' : ''}`}>
              <button className="faq-q" onClick={() => toggle(i)}>
                <span className="faq-q-text">{faq.q}</span>
                <ChevronIcon />
              </button>
              <div className="faq-body">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .faq-list { max-width: 680px; margin: 60px auto 0; text-align: left; }
        .faq-item { border-bottom: 1px solid var(--bdr); }
        .faq-q {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          padding: 20px 0; cursor: pointer; gap: 16px;
          background: none; border: none; font-family: inherit; color: var(--txt);
          text-align: left;
        }
        .faq-q-text { font-size: 15.5px; font-weight: 500; line-height: 1.4; }
        .faq-q svg { flex-shrink: 0; color: var(--txt2); transition: transform 0.25s, color 0.25s; }
        .faq-item.open .faq-q svg { transform: rotate(180deg); color: var(--acc); }
        .faq-body { max-height: 0; overflow: hidden; transition: max-height 0.35s ease; }
        .faq-item.open .faq-body { max-height: 200px; }
        .faq-body p { color: var(--txt2); font-size: 14.5px; line-height: 1.7; padding-bottom: 20px; }
      `}</style>
    </section>
  )
}

function ChevronIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
