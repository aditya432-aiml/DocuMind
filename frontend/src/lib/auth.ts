export interface AuthUser {
  id: number
  name: string
  email: string
}

interface AuthResponse {
  access_token: string
  token_type: 'bearer'
  user: AuthUser
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const TOKEN_KEY = 'documind_access_token'
const USER_KEY = 'documind_user'
const LOGOUT_MESSAGE_KEY = 'documind_logout_message'
export const AUTH_CHANGED_EVENT = 'documind-auth-changed'

function decodeJwtPayload(token: string | null): { exp?: number } | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    )
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function isTokenExpired(token: string | null) {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  return Date.now() >= payload.exp * 1000
}

async function requestAuth(path: string, body: Record<string, string>): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.detail ?? 'Authentication failed')
  }

  return data as AuthResponse
}

export async function createAccount(name: string, email: string, password: string) {
  const auth = await requestAuth('/auth/signup', { name, email, password })
  saveAuth(auth)
  return auth
}

export async function signIn(email: string, password: string) {
  const auth = await requestAuth('/auth/login', { email, password })
  saveAuth(auth)
  return auth
}

export function saveAuth(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.access_token)
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user))
  localStorage.removeItem(LOGOUT_MESSAGE_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function getStoredUser(): AuthUser | null {
  const token = getStoredToken()
  if (!token) return null

  if (isTokenExpired(token)) {
    signOut('Your session has expired. Please sign in again.')
    return null
  }

  const rawUser = localStorage.getItem(USER_KEY)
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser) as AuthUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function getLogoutMessage() {
  const msg = localStorage.getItem(LOGOUT_MESSAGE_KEY)
  if (!msg) return null
  localStorage.removeItem(LOGOUT_MESSAGE_KEY)
  return msg
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function signOut(message?: string) {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  if (message) {
    localStorage.setItem(LOGOUT_MESSAGE_KEY, message)
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function isTokenExpiringSoon(token: string | null, withinMinutes: number = 10): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  const timeRemaining = payload.exp * 1000 - Date.now()
  return timeRemaining > 0 && timeRemaining < withinMinutes * 60 * 1000
}

export async function refreshToken(): Promise<AuthResponse | null> {
  const token = getStoredToken()
  if (!token) return null

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      signOut('Your session has expired. Please sign in again.')
      return null
    }

    const data = await response.json()
    saveAuth(data)
    return data as AuthResponse
  } catch (err) {
    console.error('Failed to refresh authentication token:', err)
    return null
  }
}
