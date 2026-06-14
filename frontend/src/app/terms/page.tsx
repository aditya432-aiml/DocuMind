import Link from 'next/link'
import { LogoMark } from '@/components/LogoMark'

export default function TermsPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell legal-doc">
        <div className="legal-topbar">
          <Link href="/" className="legal-logo">
            <LogoMark />
            DocuMind
          </Link>
          <Link href="/" className="legal-home-link">Back to home</Link>
        </div>

        <p className="legal-kicker">Terms of Service</p>
        <h1>Terms of Service</h1>
        <p className="legal-lede">Last updated: June 6, 2026</p>

        <section>
          <h2>Using DocuMind</h2>
          <p>
            By using DocuMind, you agree to use the service lawfully and only
            with documents you are authorized to upload, process, and analyze.
          </p>
        </section>

        <section>
          <h2>Accounts</h2>
          <p>
            You are responsible for maintaining accurate account information and
            protecting access to your account. Notify us if you believe your
            account has been compromised.
          </p>
        </section>

        <section>
          <h2>User content</h2>
          <p>
            You retain ownership of documents and prompts you provide. You grant
            DocuMind the rights needed to host, process, display, and generate
            responses from that content for the service.
          </p>
        </section>

        <section>
          <h2>AI outputs</h2>
          <p>
            AI-generated answers may be incomplete or inaccurate. You are
            responsible for reviewing outputs before relying on them for
            decisions, reports, or legal, financial, medical, or professional
            matters.
          </p>
        </section>

        <section>
          <h2>Service changes</h2>
          <p>
            We may update, suspend, or discontinue parts of the service as the
            product evolves. We will try to provide notice when changes
            materially affect users.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For questions about these terms, contact the DocuMind team through
            your account support channel.
          </p>
        </section>

        <div className="legal-actions">
          <Link href="/legal" className="legal-action-btn legal-action-secondary">Back to legal</Link>
          <Link href="/" className="legal-action-btn legal-action-primary">Home page</Link>
        </div>
      </article>
    </main>
  )
}
