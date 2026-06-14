'use client'

interface AuthFormMessageProps {
  message: string | null
  tone?: 'error' | 'success'
}

export function AuthFormMessage({ message, tone = 'error' }: AuthFormMessageProps) {
  if (!message) return null

  return (
    <p className={`auth-form-message ${tone}`}>
      {message}
      <style jsx>{`
        .auth-form-message {
          margin: 0 0 14px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.4;
        }
        .auth-form-message.error {
          color: #ffb4ab;
          background: rgb(186 26 26 / 0.14);
          border: 1px solid rgb(186 26 26 / 0.28);
        }
        .auth-form-message.success {
          color: #86efac;
          background: rgb(22 101 52 / 0.14);
          border: 1px solid rgb(22 101 52 / 0.28);
        }
      `}</style>
    </p>
  )
}
