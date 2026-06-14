export function LogoMark() {
  return (
    <div className="logo-mark">
      <svg viewBox="0 0 17 17" fill="none" width="17" height="17">
        <path d="M2.5 2.5h7l4 4v8h-11v-12z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M9.5 2.5v4h4" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M5 9.5h7M5 12h5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <style>{`
        .logo-mark {
          width: 32px; height: 32px; background: var(--acc);
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
