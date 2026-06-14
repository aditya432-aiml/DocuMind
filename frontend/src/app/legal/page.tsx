import Link from 'next/link'
import { LogoMark } from '@/components/LogoMark'

const links = [
  {
    href: '/privacy',
    title: 'Privacy Policy',
    desc: 'How DocuMind handles account information, uploaded documents, and service data.',
  },
  {
    href: '/terms',
    title: 'Terms of Service',
    desc: 'The rules and responsibilities for using DocuMind.',
  },
]

export default function LegalPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <div className="legal-topbar">
          <Link href="/" className="legal-logo">
            <LogoMark />
            DocuMind
          </Link>
          <Link href="/" className="legal-home-link">Back to home</Link>
        </div>

        <section className="legal-hero">
          <p className="legal-kicker">Legal</p>
          <h1>Policies for using DocuMind</h1>
          <p className="legal-lede">
            Find the privacy and service terms that explain how DocuMind handles
            your data, documents, account, and product access.
          </p>
        </section>

        <div className="legal-link-grid">
          {links.map((item) => (
            <Link href={item.href} className="legal-link-card" key={item.href}>
              <div className="legal-card-icon" aria-hidden="true">
                <DocumentIcon />
              </div>
              <span>{item.title}</span>
              <p>{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
      <path d="M4 2.5h6l4 4v9H4v-13z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 2.5v4h4M6.5 10h5M6.5 12.5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
