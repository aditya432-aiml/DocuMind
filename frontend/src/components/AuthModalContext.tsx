'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { AuthModal } from './AuthModal'

type ModalType = 'login' | 'signup' | null

interface AuthModalContextType {
  open: ModalType
  openLogin: () => void
  openSignup: () => void
  close: () => void
}

const AuthModalContext = createContext<AuthModalContextType>({
  open: null,
  openLogin: () => {},
  openSignup: () => {},
  close: () => {},
})

export function useAuthModal() {
  return useContext(AuthModalContext)
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<ModalType>(null)

  const value: AuthModalContextType = {
    open,
    openLogin: () => setOpen('login'),
    openSignup: () => setOpen('signup'),
    close: () => setOpen(null),
  }

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        open={open}
        onClose={() => setOpen(null)}
        onSwitch={(t) => setOpen(t)}
      />
    </AuthModalContext.Provider>
  )
}
