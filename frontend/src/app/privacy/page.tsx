import Link from 'next/link'
import { LogoMark } from '@/components/LogoMark'

export default function PrivacyPage() {
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

        <p className="legal-kicker">Privacy Policy</p>
        <h1>Privacy Policy</h1>
        <p className="legal-lede">Last updated: June 6, 2026</p>

        <section>
          <h2>Information we collect</h2>
          <p>
            DocuMind may collect account details, authentication information,
            uploaded documents, prompts, responses, usage events, and technical
            data needed to operate and improve the service.
          </p>
        </section>

        <section>
          <h2>How we use information</h2>
          <p>
            We use information to provide document processing, answer user
            questions, maintain security, troubleshoot issues, improve product
            quality, and communicate service updates.
          </p>
        </section>

        <section>
          <h2>Documents and AI processing</h2>
          <p>
            Uploaded documents are processed to generate summaries, answers,
            citations, and related insights. Documents should only be uploaded
            when you have the right to use them with DocuMind.
          </p>
        </section>

        <section>
          <h2>Data protection</h2>
          <p>
            We use reasonable technical and organizational safeguards designed
            to protect data in transit and at rest. No internet service can
            guarantee absolute security.
          </p>
        </section>

        <section>
          <h2>Retention and deletion</h2>
          <p>
            We keep information only as long as needed for service, legal, and
            operational purposes. Users may request deletion where applicable.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For privacy questions, contact the DocuMind team through your
            account support channel.
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
