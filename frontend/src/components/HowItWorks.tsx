export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Drop your PDF',
      desc: 'Drag and drop any PDF — contracts, reports, research papers, manuals — directly into DocuMind.',
    },
    {
      num: '02',
      title: 'AI reads & understands',
      desc: 'Our AI agents parse the full document, extract context, and build an intelligent knowledge layer instantly.',
    },
    {
      num: '03',
      title: 'Ask, get answers',
      desc: 'Type any question in plain English. Get precise, cited answers referenced to the exact source section.',
    },
  ]

  return (
    <section className="section section-alt" id="how-it-works">
      <div className="container">
        <div className="tag">How it works</div>
        <h2 className="section-title">
          From drop to answer<br />in seconds
        </h2>
        <p className="section-desc">No training, no configuration. Just upload and start asking.</p>

        <div className="steps-grid">
          {steps.map((step) => (
            <div key={step.num} className="step-card">
              <div className="step-num">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
        }
        .step-num {
          width: 46px; height: 46px; border-radius: 12px;
          background: var(--acc2); border: 1px solid var(--acc3);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-dm-mono, "SFMono-Regular", Consolas, "Liberation Mono", monospace);
          font-size: 17px; font-weight: 600; color: var(--acc);
          margin-bottom: 20px;
        }
        .step-card h3 { font-size: 17px; font-weight: 600; margin-bottom: 9px; }
        .step-card p { color: var(--txt2); font-size: 14.5px; line-height: 1.65; }
        @media (max-width: 680px) {
          .steps-grid { grid-template-columns: 1fr; gap: 32px; }
        }
      `}</style>
    </section>
  )
}
