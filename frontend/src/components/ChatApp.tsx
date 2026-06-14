'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthUser } from '@/lib/auth'
import { signOut, getStoredToken } from '@/lib/auth'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  cite?: string
  thinkingSteps?: { label: string; status: 'waiting' | 'running' | 'done' | 'failed' }[]
  showThinking?: boolean
  isStreaming?: boolean
  feedback?: 'like' | 'dislike'
}

interface ChatSession {
  id: string
  title: string
  createdAt: string
  documentName: string
  messages: ChatMessage[]
}

interface ChatAppProps {
  user: AuthUser
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const STORAGE_KEY = 'documind_chat_sessions'
const MAX_PDF_SIZE = 20 * 1024 * 1024

function safeUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const SUN = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.6" stroke="currentColor" stroke-width="1.3"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1.1 1.1M10.1 10.1l1.1 1.1M10.1 3.9l1.1-1.1M2.8 11.2l1.1-1.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`
const MOON = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 9A4.5 4.5 0 015 2.5a4.5 4.5 0 100 9 4.5 4.5 0 006.5-2.5z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`

function ThinkingProcess({
  steps,
  showThinking,
  onToggle,
}: {
  steps: { label: string; status: 'waiting' | 'running' | 'done' | 'failed' }[]
  showThinking: boolean
  onToggle: () => void
}) {
  const activeStep = steps.find((s) => s.status === 'running')
  const completedCount = steps.filter((s) => s.status === 'done').length
  const totalCount = steps.length
  const isFinished = completedCount === totalCount

  // Determine header label
  let headerLabel = 'Thinking...'
  if (activeStep) {
    headerLabel = `${activeStep.label}...`
  } else if (isFinished) {
    headerLabel = showThinking ? 'Hide thought process' : 'Show thought process'
  }

  return (
    <div className="thinking-container">
      <button type="button" className="thinking-toggle" onClick={onToggle}>
        <div className="thinking-header-left">
          <div className="thinking-logo">
            <svg viewBox="0 0 17 17" fill="none" width="10" height="10" stroke="currentColor" strokeWidth="1.4">
              <path d="M2.5 2.5h7l4 4v8h-11v-12z" strokeLinejoin="round" />
              <path d="M9.5 2.5v4h4" strokeLinejoin="round" />
              <path d="M5 9.5h7M5 12h5" strokeLinecap="round" />
            </svg>
          </div>
          {!isFinished ? (
            <div className="thinking-pulse-loader">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          ) : (
            <span className="thinking-check-icon">✓</span>
          )}
          <span className="thinking-header-text">{headerLabel}</span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: showThinking ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: 'var(--txt3)',
          }}
        >
          <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {showThinking && (
        <div className="thinking-details">
          {steps.map((step, idx) => (
            <div key={idx} className={`thinking-step-row ${step.status}`}>
              <div className="step-bullet">
                {step.status === 'done' && <span className="step-done">✓</span>}
                {step.status === 'running' && <div className="step-loader" />}
                {step.status === 'waiting' && <div className="step-dot" />}
                {step.status === 'failed' && <span className="step-failed">×</span>}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ChatApp({ user }: ChatAppProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isAlreadyIndexed, setIsAlreadyIndexed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'legal'>('profile')
  const [isLoaded, setIsLoaded] = useState(false)
  const [shareMenuOpenId, setShareMenuOpenId] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev))
    }, 3000)
  }

  function handleCopy(messageId: string, content: string) {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    showToast("Response copied to clipboard!")
    setTimeout(() => {
      setCopiedMessageId((prev) => (prev === messageId ? null : prev))
    }, 2000)
  }

  function handleShareEmail(content: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const emailBody = `${content}\n\n---\nDocuMind | AI-Powered Document Intelligence\nTry it here: ${origin}`
    window.location.href = `mailto:?subject=DocuMind AI Response&body=${encodeURIComponent(emailBody)}`
    setShareMenuOpenId(null)
  }

  function handleShareLinkedIn(content: string) {
    navigator.clipboard.writeText(content)
    showToast("LinkedIn sharing initiated! Response text copied to clipboard. Paste it (Ctrl/Cmd+V) in your post.")
    setShareMenuOpenId(null)
    
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(origin)}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  function handleShareWhatsApp(content: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const waText = `${content}\n\nShared via DocuMind: ${origin}`
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
    setShareMenuOpenId(null)
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  function handleFeedback(messageId: string, type: 'like' | 'dislike') {
    if (!activeSession) return
    setSessions((current) =>
      current.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              messages: session.messages.map((msg) =>
                msg.id === messageId
                  ? { ...msg, feedback: msg.feedback === type ? undefined : type }
                  : msg
              ),
            }
          : session
      )
    )
  }

  function toggleShareMenu(messageId: string) {
    setShareMenuOpenId((prev) => (prev === messageId ? null : messageId))
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`
  }, [draft])

  // Reset draft input and file attachments when switching active sessions
  useEffect(() => {
    setDraft('')
    setAttachedFile(null)
    setFileError(null)
    setIsAlreadyIndexed(false)
  }, [activeSessionId])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 800) {
      setSidebarOpen(false)
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      createNewSession()
      setIsLoaded(true)
      return
    }

    try {
      const rawSessions = JSON.parse(raw) as ChatSession[]
      const stored = rawSessions.map((session) => {
        const isLegacyHi = session.messages.length === 1 && session.messages[0].content.trim().toLowerCase() === 'hi'
        return isLegacyHi ? { ...session, messages: [] } : session
      })
      if (stored.length === 0) {
        createNewSession()
      } else {
        setSessions(stored)
        setActiveSessionId(stored[0]?.id ?? null)
      }
    } catch {
      createNewSession()
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    // Persist only sessions that have at least one message
    const nonEmpty = sessions.filter((session) => session.messages.length > 0)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nonEmpty))
  }, [sessions, isLoaded])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('dm-theme', theme)
  }, [theme])

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('dm-theme')
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme)
    }
  }, [])

  // Listen for ?settings=true in the URL to open the Settings modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('settings') === 'true') {
        setSettingsOpen(true)
        setSettingsTab('profile')
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  const router = useRouter()

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
    [sessions, activeSessionId],
  )

  const lastMessageContent = activeSession?.messages.at(-1)?.content
  const lastMessageIsStreaming = activeSession?.messages.at(-1)?.isStreaming
  const messagesLength = activeSession?.messages.length ?? 0

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
  }, [messagesLength, lastMessageContent, lastMessageIsStreaming])

  const filteredSessions = useMemo(
    () => sessions.filter((session) =>
      (session.messages.length > 0 || session.id === activeSessionId) &&
      (session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
       session.documentName.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [sessions, searchQuery, activeSessionId],
  )

  function createNewSession() {
    const session: ChatSession = {
      id: safeUUID(),
      title: 'New chat',
      createdAt: new Date().toISOString(),
      documentName: 'No document',
      messages: [],
    }

    // Keep the new empty session and filter out any other empty sessions from state
    setSessions((current) => [session, ...current.filter((s) => s.messages.length > 0)])
    setActiveSessionId(session.id)
    setDraft('')
    setAttachedFile(null)
    setFileError(null)
    if (typeof window !== 'undefined' && window.innerWidth <= 800) {
      setSidebarOpen(false)
    }
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  function handleSelectSession(sessionId: string) {
    // Purge other empty sessions from state when switching
    setSessions((current) => current.filter((s) => s.messages.length > 0 || s.id === sessionId))
    setActiveSessionId(sessionId)
    if (typeof window !== 'undefined' && window.innerWidth <= 800) {
      setSidebarOpen(false)
    }
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  function deleteSession(sessionId: string) {
    setSessions((current) => {
      const nextSessions = current.filter((item) => item.id !== sessionId)
      if (nextSessions.length === 0) {
        const newSession: ChatSession = {
          id: safeUUID(),
          title: 'New chat',
          createdAt: new Date().toISOString(),
          documentName: 'No document',
          messages: [],
        }
        setActiveSessionId(newSession.id)
        return [newSession]
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(nextSessions[0]?.id ?? null)
      }
      return nextSessions
    })
  }

  function renderTitle(session: ChatSession) {
    const firstUser = session.messages.find((message) => message.role === 'user')
    if (!firstUser) return 'New chat'
    const firstLine = firstUser.content.split('\n')[0].trim()
    return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine
  }

  function getSessionTimestamp(session: ChatSession) {
    const lastMessage = session.messages.at(-1)
    return lastMessage?.createdAt ?? session.createdAt
  }

  function formatTime(timestamp: string) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(timestamp))
  }

  function getUserInitials() {
    return user.name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  function renderText(text: string) {
    let html = ''
    let inTable = false
    let tableHeaders: string[] = []
    let tableRows: string[][] = []

    const flushTable = () => {
      if (tableHeaders.length > 0 || tableRows.length > 0) {
        html += '<div class="ai-table-container"><table class="ai-table">'
        if (tableHeaders.length > 0) {
          html += '<thead><tr>'
          tableHeaders.forEach((h) => {
            html += `<th>${h}</th>`
          })
          html += '</tr></thead>'
        }
        if (tableRows.length > 0) {
          html += '<tbody>'
          tableRows.forEach((row) => {
            html += '<tr>'
            row.forEach((cell) => {
              html += `<td>${cell}</td>`
            })
            html += '</tr>'
          })
          html += '</tbody>'
        }
        html += '</table></div>'
        tableHeaders = []
        tableRows = []
      }
      inTable = false
    }

    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Detect table line (e.g. | Role | Org | Duration |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)

        // Check if separator line (e.g. |---|---|)
        const isSeparator = cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c))
        if (isSeparator) {
          continue
        }

        const formattedCells = cells.map((c) =>
          c
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>'),
        )

        if (!inTable) {
          inTable = true
          tableHeaders = formattedCells
        } else {
          tableRows.push(formattedCells)
        }
        continue
      } else {
        if (inTable) {
          flushTable()
        }
      }

      // Horizontal Rule
      if (trimmed === '---') {
        html += '<hr class="ai-hr" />'
        continue
      }

      // Headers (H1 - H4)
      const headerMatch = trimmed.match(/^(#{1,4})\s+(.*)/)
      if (headerMatch) {
        const level = headerMatch[1].length
        const body = headerMatch[2]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
        html += `<h${level} class="ai-header">${body}</h${level}>`
        continue
      }

      // Numbered list item
      const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
      if (numListMatch) {
        const body = numListMatch[2]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
        html += `<div class="ai-list-item"><span class="ai-list-num">${numListMatch[1]}.</span><span>${body}</span></div>`
        continue
      }

      // Bullet list item (supports *, -, or bullet)
      const bulletListMatch = trimmed.match(/^([*\-•])\s+(.*)/)
      if (bulletListMatch) {
        const body = bulletListMatch[2]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
        html += `<div class="ai-list-item"><span class="ai-list-bullet">•</span><span>${body}</span></div>`
        continue
      }

      // Empty line
      if (trimmed === '') {
        html += '<div style="height:6px"></div>'
        continue
      }

      // Regular paragraph
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
      const formattedLine = escapedLine
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
      html += `<div class="ai-paragraph">${formattedLine}</div>`
    }

    if (inTable) {
      flushTable()
    }

    return html
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      setAttachedFile(null)
      setFileError(null)
      setIsAlreadyIndexed(false)
      return
    }

    if (file.type !== 'application/pdf') {
      setAttachedFile(null)
      setFileError('Only PDF files are accepted')
      setIsAlreadyIndexed(false)
      return
    }

    if (file.size > MAX_PDF_SIZE) {
      setAttachedFile(null)
      setFileError('PDF size must be 20MB or smaller')
      setIsAlreadyIndexed(false)
      return
    }

    setAttachedFile(file)
    setFileError(null)

    // Check if the file is already processed in ChromaDB
    setIsAlreadyIndexed(false)
    const token = getStoredToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    fetch(`${API_BASE_URL}/api/check?filename=${encodeURIComponent(file.name)}`, {
      headers,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setIsAlreadyIndexed(true)
        }
      })
      .catch((err) => console.error('Failed to check document existence:', err))
  }

  function clearAttachment() {
    setAttachedFile(null)
    setFileError(null)
    setIsAlreadyIndexed(false)
  }

  function usePrompt(promptText: string) {
    setDraft(promptText)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim() && !attachedFile) return
    if (!activeSession) return

    const question = draft.trim()
    const fileToUpload = attachedFile
    const isDocIndexed = isAlreadyIndexed

    // Clear inputs immediately for responsive UI
    setDraft('')
    clearAttachment()

    // Add user message to UI
    const attachmentsText = fileToUpload ? `\n[PDF attached: ${fileToUpload.name}]` : ''
    const userMessage: ChatMessage = {
      id: safeUUID(),
      role: 'user',
      content: `${question || `Uploaded PDF: ${fileToUpload?.name}`}${attachmentsText}`,
      createdAt: new Date().toISOString(),
    }

    // Initialize pipeline steps with explicit types for TS safety
    type StepStatus = 'waiting' | 'running' | 'done' | 'failed'
    interface PipelineStep {
      label: string
      status: StepStatus
    }

    const initialSteps: PipelineStep[] = fileToUpload
      ? [
          { label: 'Simmering document layouts', status: 'running' },
          { label: 'Stirring sections and heading boundaries', status: 'waiting' },
          { label: 'Blending data', status: 'waiting' },
          { label: 'Brewing semantic representations', status: 'waiting' },
          { label: 'Cooking answers', status: 'waiting' },
          { label: 'Plating query results', status: 'waiting' },
        ]
      : [
          { label: 'Simmering query', status: 'running' },
          { label: 'Infusing with document context', status: 'waiting' },
          { label: 'Brewing semantic representations', status: 'waiting' },
          { label: 'Steeping for matching context', status: 'waiting' },
        ]

    // Add a temporary "assistant is thinking..." message with steps
    const tempAssistantId = safeUUID()
    const tempAssistantMessage: ChatMessage = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      thinkingSteps: initialSteps,
      showThinking: true, // open thought process by default
    }

    // Append user message and temporary assistant message
    setSessions((current) =>
      current.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              messages: [...session.messages, userMessage, tempAssistantMessage],
              title: renderTitle({ ...session, messages: [...session.messages, userMessage] }),
            }
          : session,
      ),
    )

    const updateSteps = (steps: typeof initialSteps) => {
      setSessions((current) =>
        current.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                messages: session.messages.map((msg) =>
                  msg.id === tempAssistantId ? { ...msg, thinkingSteps: [...steps] } : msg
                ),
              }
            : session,
        ),
      )
    }

    try {
      // Yield execution to allow React to flush the user and assistant message addition state
      await new Promise((resolve) => setTimeout(resolve, 100))

      let currentDocName = activeSession.documentName
      const currentSteps = [...initialSteps]
      let queryData: any = null
      let searchResults: any[] = []

      // Run progress steps sequentially
      if (fileToUpload) {
        if (!isDocIndexed) {
          // Step 1: Partitioning (runs for 2.0s as requested by user)
          await new Promise((resolve) => setTimeout(resolve, 2000))
          currentSteps[0].status = 'done'
          currentSteps[1].status = 'running'
          updateSteps(currentSteps)

          // Step 2: Chunking (simulated 1.0s)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          currentSteps[1].status = 'done'
          currentSteps[2].status = 'running'
          updateSteps(currentSteps)

          // Step 3: Normalization (simulated 1.0s)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          currentSteps[2].status = 'done'
          currentSteps[3].status = 'running'
          updateSteps(currentSteps)

          // Step 4: Embeddings (simulated 1.0s)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          currentSteps[3].status = 'done'
          currentSteps[4].status = 'running'
          updateSteps(currentSteps)

          // Run actual upload
          const formData = new FormData()
          formData.append('file', fileToUpload)

          const uploadToken = getStoredToken()
          const uploadHeaders: Record<string, string> = {}
          if (uploadToken) {
            uploadHeaders['Authorization'] = `Bearer ${uploadToken}`
          }

          const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            headers: uploadHeaders,
            body: formData,
          })

          if (!uploadResponse.ok) {
            const errData = await uploadResponse.json().catch(() => ({}))
            throw new Error(errData.detail || 'Failed to upload and process PDF.')
          }

          const uploadData = await uploadResponse.json()
          currentDocName = uploadData.filename

          // Step 5: Cooking answers (simulated 1.0s)
          currentSteps[4].status = 'done'
          currentSteps[5].status = 'running'
          updateSteps(currentSteps)
          await new Promise((resolve) => setTimeout(resolve, 1000))

        } else {
          // File is already indexed, run a quick sequential animation for premium feel
          // Step 1: Partitioning (runs for 2.0s as requested by user)
          await new Promise((resolve) => setTimeout(resolve, 2000))
          currentSteps[0].status = 'done'
          currentSteps[1].status = 'done'
          currentSteps[2].status = 'done'
          currentSteps[3].status = 'done'
          currentSteps[4].status = 'done'
          currentSteps[5].status = 'running'
          updateSteps(currentSteps)
          currentDocName = fileToUpload.name
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        // Final Step: Query the database with the question
        const searchQuery = question || 'What is the summary of the document?'
        const queryToken = getStoredToken()
        const queryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (queryToken) {
          queryHeaders['Authorization'] = `Bearer ${queryToken}`
        }
        const queryResponse = await fetch(`${API_BASE_URL}/api/query`, {
          method: 'POST',
          headers: queryHeaders,
          body: JSON.stringify({
            question: searchQuery,
            document_name: currentDocName,
          }),
        })

        if (!queryResponse.ok) {
          const errData = await queryResponse.json().catch(() => ({}))
          throw new Error(errData.detail || 'Failed to query the document database.')
        }

        queryData = await queryResponse.json()
        searchResults = queryData.results || []

        currentSteps[5].status = 'done'
        updateSteps(currentSteps)

      } else {
        // Query-only path
        // Step 0: Simmering query (runs for 2.0s as requested by user)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        currentSteps[0].status = 'done'
        currentSteps[1].status = 'running'
        updateSteps(currentSteps)

        // Step 1: Infusing with document context (simulated 1.0s)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        currentSteps[1].status = 'done'
        currentSteps[2].status = 'running'
        updateSteps(currentSteps)

        // Step 2: Brewing representations (simulated 1.0s)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        currentSteps[2].status = 'done'
        currentSteps[3].status = 'running'
        updateSteps(currentSteps)

        // Step 3: Steeping for matching context (runs actual query)
        const searchQuery = question || 'What is the summary of the document?'
        const queryToken = getStoredToken()
        const queryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (queryToken) {
          queryHeaders['Authorization'] = `Bearer ${queryToken}`
        }
        const queryResponse = await fetch(`${API_BASE_URL}/api/query`, {
          method: 'POST',
          headers: queryHeaders,
          body: JSON.stringify({
            question: searchQuery,
            document_name: currentDocName,
          }),
        })

        if (!queryResponse.ok) {
          const errData = await queryResponse.json().catch(() => ({}))
          throw new Error(errData.detail || 'Failed to query the document database.')
        }

        queryData = await queryResponse.json()
        searchResults = queryData.results || []

        currentSteps[3].status = 'done'
        updateSteps(currentSteps)
      }

      // Step 3: Format the response
      let replyContent = ''
      let citation = undefined

      const uniqueCites: string[] = []
      if (searchResults && searchResults.length > 0) {
        searchResults.forEach((res: any) => {
          const text = `${res.source_file} · Page ${res.page_number}${res.section ? ` (${res.section})` : ''}`
          if (!uniqueCites.includes(text)) {
            uniqueCites.push(text)
          }
        })
        if (uniqueCites.length > 0) {
          citation = uniqueCites.join(' , ')
        }
      }

      if (queryData.answer) {
        replyContent = queryData.answer
      } else if (searchResults.length > 0) {
        replyContent = `Based on the vector database search in **${currentDocName}**, here are the most relevant sections found:\n\n`
        searchResults.forEach((res: any, index: number) => {
          const sectionHeader = res.section ? `Section: ${res.section}` : `Result ${index + 1}`
          replyContent += `${index + 1}. **${sectionHeader}** (Page ${res.page_number}, Type: ${res.element_type}):\n   ${res.content}\n\n`
        })
      } else {
        replyContent = fileToUpload
          ? `Successfully processed and indexed **${currentDocName}** in ChromaDB. However, search returned no relevant results. You can now ask questions about the PDF!`
          : `No relevant information was found in the vector database for your query. Please make sure the document is uploaded.`
      }

      // Collapses the thought box once we start answering
      setSessions((current) =>
        current.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                messages: session.messages.map((msg) =>
                  msg.id === tempAssistantId ? { ...msg, showThinking: false } : msg
                ),
              }
            : session,
        ),
      )

      // Step 4: Stream response word-by-word
      await new Promise<void>((resolve) => {
        let currentText = ''
        const words = replyContent.split(' ')
        let wordIdx = 0

        const interval = setInterval(() => {
          if (wordIdx < words.length) {
            currentText += (wordIdx === 0 ? '' : ' ') + words[wordIdx]
            wordIdx++
            setSessions((current) =>
              current.map((session) =>
                session.id === activeSession.id
                  ? {
                      ...session,
                      documentName: currentDocName,
                      messages: session.messages.map((msg) =>
                        msg.id === tempAssistantId
                          ? {
                              ...msg,
                              content: currentText,
                              cite: citation,
                              isStreaming: true,
                              createdAt: new Date().toISOString(),
                            }
                          : msg,
                      ),
                    }
                  : session,
              ),
            )
          } else {
            clearInterval(interval)
            // Remove cursor/typing indicators in final render
            setSessions((current) =>
              current.map((session) =>
                session.id === activeSession.id
                  ? {
                      ...session,
                      messages: session.messages.map((msg) =>
                        msg.id === tempAssistantId
                          ? {
                              ...msg,
                              content: replyContent,
                              cite: citation,
                              isStreaming: false,
                              createdAt: new Date().toISOString(),
                            }
                          : msg,
                      ),
                    }
                  : session,
              ),
            )
            resolve()
          }
        }, 48) // 48ms per word for a more natural, readable typing animation speed
      })

    } catch (error: any) {
      console.error(error)
      // Update steps to failed on error
      const failedSteps = initialSteps.map((step) =>
        step.status === 'running' || step.status === 'waiting'
          ? { ...step, status: 'failed' as const }
          : step,
      )
      
      setSessions((current) =>
        current.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                messages: session.messages.map((msg) =>
                  msg.id === tempAssistantId
                    ? {
                        ...msg,
                        content: `⚠️ **Error:** ${error.message || 'An unexpected error occurred while communicating with the PDF pipeline.'}`,
                        thinkingSteps: failedSteps,
                        showThinking: true,
                        createdAt: new Date().toISOString(),
                      }
                    : msg,
                ),
              }
            : session,
        ),
      )
    }
  }

  function toggleThinking(messageId: string) {
    setSessions((current) =>
      current.map((session) => ({
        ...session,
        messages: session.messages.map((msg) =>
          msg.id === messageId ? { ...msg, showThinking: !msg.showThinking } : msg
        ),
      })),
    )
  }

  function toggleSidebar() {
    setSidebarOpen((current) => !current)
  }

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  function openSettings() {
    setSettingsOpen(true)
    setSettingsTab('profile')
  }

  function closeSettings() {
    setSettingsOpen(false)
  }

  function handleLogout() {
    signOut('You have been logged out successfully.')
    router.push('/')
  }

  const activeDocument = attachedFile?.name ?? activeSession?.documentName ?? 'No document'

  return (
    <section className="documind-app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {sidebarOpen ? (
          <>
            <div className="sb-head">
              <div className="logo">
                <div className="lm">
                  <svg viewBox="0 0 17 17" fill="none" width="12" height="12">
                    <path d="M2.5 2.5h7l4 4v8h-11v-12z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M9.5 2.5v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M5 9.5h7M5 12h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                DocuMind
              </div>
              <div className="sb-head-actions">
                <button className="ib theme-btn" onClick={toggleTheme} dangerouslySetInnerHTML={{ __html: theme === 'dark' ? SUN : MOON }} title={theme === 'dark' ? 'Use light mode' : 'Use dark mode'} />
                <button className="ib" onClick={toggleSidebar} title="Collapse sidebar">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <rect x="1.5" y="1.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5.5 1.5v12" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                </button>
              </div>
            </div>

            <button className="new-chat-btn" onClick={createNewSession}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New chat
            </button>

            <div className="sb-search">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search chats…"
              />
            </div>

            <div className="sb-list">
              {filteredSessions.length ? (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`sb-item${session.id === activeSession?.id ? ' active' : ''}`}
                    onClick={() => handleSelectSession(session.id)}
                  >
                    <div className="sb-item-content">
                      <span className="sb-item-title">{session.title}</span>
                      <span className="sb-item-meta">{session.documentName}</span>
                    </div>
                    <button
                      type="button"
                      className="sb-item-delete"
                      title="Delete chat"
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteSession(session.id)
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 3.5h7M3.5 3.5V9.5a1 1 0 001 1h3a1 1 0 001-1V3.5M4.5 3.5V2a1 1 0 011-1h1a1 1 0 011 1v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))
              ) : sessions.length ? (
                <p className="empty-search">No chats found matching "{searchQuery}"</p>
              ) : (
                <p className="empty-search">Currently there is no chat history.</p>
              )}
            </div>

            <div className="sb-foot">
              <div className="user-row" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <div className="u-av">{getUserInitials()}</div>
                <div style={{ minWidth: 0 }}>
                  <span className="u-name">{user.name}</span>
                  <span className="u-email">{user.email}</span>
                </div>
              </div>
              <div className="sb-actions">
                <button type="button" className="sb-action-btn" onClick={openSettings}>
                  Settings
                </button>
                <button type="button" className="sb-action-btn sb-action-logout" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="sb-collapsed-content">
            <div className="sb-collapsed-top">
              <button className="ib" onClick={toggleSidebar} title="Expand sidebar">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="1.5" y="1.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M5.5 1.5v12" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
              </button>
              <button className="ib" onClick={createNewSession} title="New chat">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="ib theme-btn" onClick={toggleTheme} dangerouslySetInnerHTML={{ __html: theme === 'dark' ? SUN : MOON }} title={theme === 'dark' ? 'Use light mode' : 'Use dark mode'} />
            </div>

            <div className="sb-collapsed-bottom">
              <div className="u-av" onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ cursor: 'pointer' }}>
                {getUserInitials()}
              </div>
            </div>
          </div>
        )}
      </aside>

      {userMenuOpen && (
        <>
          <div className="menu-backdrop" onClick={() => setUserMenuOpen(false)} />
          <div className="user-popup-menu" style={{ left: sidebarOpen ? '260px' : '64px' }}>
            <button type="button" className="menu-item" onClick={() => { setUserMenuOpen(false); openSettings(); }}>
              Settings
            </button>
            <button type="button" className="menu-item menu-item-logout" onClick={() => { setUserMenuOpen(false); handleLogout(); }}>
              Log out
            </button>
          </div>
        </>
      )}

      {sidebarOpen && (
        <div className="mobile-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="main-panel">
        <header className="topbar">
          <button type="button" className="mobile-menu-btn" onClick={toggleSidebar} title="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="topbar-brand">
            DocuMind
          </div>

          <div className="doc-chip">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1.5 1.5h5.5l3.5 3.5V10.5h-9v-9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M7 1.5V5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            <span>{activeDocument}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--txt3)', flexShrink: 0 }}>
              <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </header>

        <div className="content-area">
          {activeSession?.messages.length ? (
            <div className="msgs-scroller" ref={scrollerRef}>
              <div className="msgs-col">
                {activeSession.messages.map((message) => (
                  <div key={message.id} className={message.role === 'user' ? 'msg-user' : 'msg-ai'}>
                    {message.role === 'user' ? (
                      <div className="msg-user-inner">
                        <div className="msg-user-bubble">{message.content}</div>
                        <div className="msg-ts">{formatTime(message.createdAt)}</div>
                      </div>
                    ) : (
                      <>
                        <div className="ai-av">
                          <svg viewBox="0 0 17 17" fill="none" width="12" height="12">
                            <path d="M2.5 2.5h7l4 4v8h-11v-12z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/>
                            <path d="M9.5 2.5v4h4" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/>
                            <path d="M5 9.5h7M5 12h5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                        </div>
                         <div className="ai-content">
                           <div className="ai-name">DocuMind</div>
                           {message.thinkingSteps && message.thinkingSteps.length > 0 && (
                             <ThinkingProcess
                               steps={message.thinkingSteps}
                               showThinking={message.showThinking ?? false}
                               onToggle={() => toggleThinking(message.id)}
                             />
                           )}
                            <div className="ai-prose">
                              <span dangerouslySetInnerHTML={{ __html: renderText(message.content) }} />
                              {message.isStreaming && (
                                <span className="typing-loader">
                                  <span className="dot" />
                                  <span className="dot" />
                                  <span className="dot" />
                                </span>
                              )}
                            </div>
                            <div className="ai-actions">
                              {message.cite ? (
                                <div className="ai-citations-list">
                                  {message.cite.split(' , ').map((c, i) => (
                                    <div key={i} className="ai-citation">{c}</div>
                                  ))}
                                </div>
                              ) : <div />}

                              {!message.isStreaming && (
                                <div className="ai-action-buttons">
                                  <button
                                    type="button"
                                    className="action-icon-btn"
                                    title="Copy response"
                                    onClick={() => handleCopy(message.id, message.content)}
                                  >
                                    {copiedMessageId === message.id ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                      </svg>
                                    )}
                                  </button>
                                  
                                  <button
                                    type="button"
                                    className={`action-icon-btn${message.feedback === 'like' ? ' active-like' : ''}`}
                                    title="Like response"
                                    onClick={() => handleFeedback(message.id, 'like')}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                    </svg>
                                  </button>

                                  <button
                                    type="button"
                                    className={`action-icon-btn${message.feedback === 'dislike' ? ' active-dislike' : ''}`}
                                    title="Dislike response"
                                    onClick={() => handleFeedback(message.id, 'dislike')}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                                    </svg>
                                  </button>

                                  <div className="share-menu-container">
                                    <button
                                      type="button"
                                      className="action-icon-btn"
                                      title="Share response"
                                      onClick={() => toggleShareMenu(message.id)}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                                      </svg>
                                    </button>
                                    {shareMenuOpenId === message.id && (
                                      <>
                                        <div className="share-menu-backdrop" onClick={() => setShareMenuOpenId(null)} />
                                        <div className="share-dropdown-menu">
                                          <button
                                            type="button"
                                            className="share-menu-item"
                                            onClick={() => handleShareEmail(message.content)}
                                          >
                                            Email
                                          </button>
                                          <button
                                            type="button"
                                            className="share-menu-item"
                                            onClick={() => handleShareLinkedIn(message.content)}
                                          >
                                            LinkedIn
                                          </button>
                                          <button
                                            type="button"
                                            className="share-menu-item"
                                            onClick={() => handleShareWhatsApp(message.content)}
                                          >
                                            WhatsApp
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                         </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state-panel">
              <div className="drop-zone" onClick={() => document.getElementById('attach-file-input')?.click()}>
                <div className="drop-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3.5 13v3a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M10 3v9M6.5 6l3.5-3 3.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="drop-title">Drop a PDF to get started</p>
                <p className="drop-sub">or click to browse files</p>
              </div>
              <div className="suggestions">
                {['Summarize the key points', 'What are the main obligations?', 'Extract all dates & deadlines', 'Highlight any red-flag clauses'].map((prompt) => (
                  <button key={prompt} type="button" className="sugg-btn" onClick={() => usePrompt(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form className="input-area" onSubmit={handleSubmit}>
          <div className="input-wrap">
            {attachedFile && (
              <div className="input-file-preview">
                <div className="file-chip">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: '6px', color: 'var(--acc)', flexShrink: 0 }}>
                    <path d="M1.5 1.5h5.5l3.5 3.5V10.5h-9v-9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M7 1.5V5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  <span className="file-name" title={attachedFile.name}>{attachedFile.name}</span>
                  {isAlreadyIndexed && (
                    <span className="indexed-badge" title="This file is already processed and stored in ChromaDB. Direct querying will be used.">
                      ✓ Already indexed
                    </span>
                  )}
                  <button type="button" className="clear-file-btn" onClick={clearAttachment} title="Remove PDF">
                    ×
                  </button>
                </div>
              </div>
            )}
            {fileError && (
              <div className="input-file-error">
                <span className="error-icon">⚠️</span>
                <span className="error-msg">{fileError}</span>
                <button type="button" className="clear-error-btn" onClick={() => setFileError(null)} title="Clear error">
                  ×
                </button>
              </div>
            )}
            <div className="input-row">
              <label className="attach-btn" title="Attach PDF">
                <input
                  key={attachedFile ? 'attached' : 'empty'}
                  id="attach-file-input"
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={handleFileChange}
                />
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M12.5 7L6.5 13a3.5 3.5 0 01-4.95-4.95l6.5-6.5a2 2 0 012.83 2.83L4.38 11.88a.5.5 0 01-.71-.71l5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </label>
              <textarea
                ref={textareaRef}
                className="inp-ta"
                placeholder="Ask anything about your document…"
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    document.getElementById('send-button')?.click()
                  }
                }}
              />
              <button
                id="send-button"
                type="submit"
                className="send-btn"
                disabled={!draft.trim() && !attachedFile}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 13.5V2.5M3 7.5l5-5 5 5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          <p className="input-hint">
            DocuMind answers only from your document · <button type="button" className="hint-link">{activeDocument}</button>
          </p>
        </form>
      </div>      {settingsOpen && (
        <div className="settings-modal-overlay" role="dialog" aria-modal="true" onClick={closeSettings}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            {/* Sidebar Navigation */}
            <aside className="settings-sidebar-pane">
              <div className="sidebar-brand">
                <div className="logo">
                  <div className="lm">
                    <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </div>
                  <span>DocuMind</span>
                </div>
                <p className="sidebar-sub">App Settings</p>
              </div>

              <nav className="sidebar-nav">
                <button
                  type="button"
                  className={`nav-item${settingsTab === 'profile' ? ' active' : ''}`}
                  onClick={() => setSettingsTab('profile')}
                >
                  Profile & Account
                </button>
                <button
                  type="button"
                  className={`nav-item${settingsTab === 'legal' ? ' active' : ''}`}
                  onClick={() => setSettingsTab('legal')}
                >
                  Legal Policies
                </button>
              </nav>

              <div className="sidebar-footer">
                <button type="button" className="btn-close-settings" onClick={closeSettings}>
                  Close Settings
                </button>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="settings-content">
              <button type="button" className="modal-close" onClick={closeSettings} aria-label="Close settings">
                ×
              </button>
              {settingsTab === 'profile' && (
                <div className="content-pane">
                  <header className="pane-header">
                    <h1>Profile & Account</h1>
                    <p>Review your account credentials and personal details.</p>
                  </header>

                  <div className="pane-section">
                    <div className="profile-identity">
                      <div className="profile-avatar">{getUserInitials()}</div>
                      <div>
                        <h2>{user.name}</h2>
                        <p>{user.email}</p>
                      </div>
                    </div>

                    <div className="profile-details-card">
                      <div className="detail-item">
                        <span>Full name</span>
                        <strong>{user.name}</strong>
                      </div>
                      <div className="detail-item">
                        <span>Email address</span>
                        <strong>{user.email}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pane-section border-top">
                    <h2>Account Status</h2>
                    <div className="status-card">
                      <div className="status-header">
                        <span className="badge-free">Free Tier</span>
                        <p>Upgrade to Pro for team sharing and larger document sizes.</p>
                      </div>
                      <div className="status-grid">
                        <div className="status-stat">
                          <span>PDF upload limit</span>
                          <strong>20 MB / file</strong>
                        </div>
                        <div className="status-stat">
                          <span>Active Storage</span>
                          <strong>100 MB</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pane-section border-top">
                    <h2>Danger Zone</h2>
                    <div className="danger-zone-card">
                      <div>
                        <h3>Delete Account</h3>
                        <p>Permanently remove your account and purge all active chat history and documents.</p>
                      </div>
                      <button type="button" className="btn-danger" style={{ padding: '10px 18px', fontSize: '13.5px' }}>
                        Delete Account...
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'legal' && (
                <div className="content-pane">
                  <header className="pane-header">
                    <h1>Legal Policies</h1>
                    <p>Review DocuMind terms of usage, privacy frameworks, and security.</p>
                  </header>

                  <div className="pane-section">
                    <h2>Documents & Policies</h2>
                    <div className="legal-links-grid">
                      <a href="/terms" className="legal-card-item" target="_blank" rel="noopener noreferrer">
                        <h3>Terms of Service</h3>
                        <p>Read about rules, requirements, and compliance metrics for usage.</p>
                      </a>
                      <a href="/privacy" className="legal-card-item" target="_blank" rel="noopener noreferrer">
                        <h3>Privacy Policy</h3>
                        <p>Learn how we protect, handle, and secure your uploaded documents.</p>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}
      <style>{`
        .documind-app {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg);
          position: relative;
        }

        .sidebar {
          width: 252px;
          flex-shrink: 0;
          background: var(--surf);
          border-right: 1px solid var(--bdr);
          display: flex;
          flex-direction: column;
          transition: width 0.22s cubic-bezier(.4,0,.2,1);
          overflow: hidden;
        }

        .sidebar.closed {
          width: 56px;
        }

        .sb-collapsed-content {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0 12px;
          width: 56px;
        }

        .sb-collapsed-top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .sb-collapsed-bottom {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 99;
          background: transparent;
        }

        .user-popup-menu {
          position: absolute;
          left: 64px;
          bottom: 12px;
          background: var(--surf);
          border: 1px solid var(--bdr);
          border-radius: 14px;
          padding: 6px;
          min-width: 140px;
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 100;
          animation: popFade 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes popFade {
          from { opacity: 0; transform: scale(0.95) translateX(-8px); }
          to { opacity: 1; transform: scale(1) translateX(0); }
        }

        .menu-item {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--txt);
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: background 0.1s;
        }

        .menu-item:hover {
          background: var(--surf2);
        }

        .menu-item-logout {
          color: #ea5455;
        }

        .menu-item-logout:hover {
          background: rgba(234, 84, 85, 0.08);
        }

        .sb-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 12px 0;
        }

        .sb-head-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -0.025em;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .lm {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--acc);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }

        .ib {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          color: var(--txt3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.12s, color 0.12s;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .ib:hover {
          background: var(--surf2);
          color: var(--txt);
        }

        .new-chat-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 10px 10px 6px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--txt2);
          background: transparent;
          border: 1px solid var(--bdr);
          cursor: pointer;
          transition: background 0.12s, color 0.12s;
        }

        .new-chat-btn:hover {
          background: var(--surf2);
          color: var(--txt);
        }

        .sb-search {
          padding: 0 10px 6px;
        }

        .sb-search input {
          width: 100%;
          background: var(--surf2);
          border: 1px solid var(--bdr);
          border-radius: 7px;
          padding: 7px 10px;
          font-size: 12.5px;
          color: var(--txt);
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }

        .sb-search input:focus {
          border-color: var(--acc);
        }

        .sb-search input::placeholder {
          color: var(--txt3);
        }

        .sb-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 6px 8px;
        }

        .sb-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 10px;
          border-radius: 10px;
          margin-bottom: 4px;
          color: var(--txt2);
          transition: background 0.1s, color 0.1s;
          background: transparent;
          cursor: pointer;
        }

        .sb-item:hover,
        .sb-item.active {
          background: var(--surf);
          color: var(--txt);
        }

        .sb-item-content {
          flex: 1;
          min-width: 0;
        }

        .sb-item-title {
          display: block;
          font-size: 12.5px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sb-item-meta {
          display: block;
          font-size: 11px;
          color: var(--txt3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }

        .sb-item-delete {
          opacity: 0;
          transition: opacity 0.12s;
          background: transparent;
          border: none;
          color: var(--txt3);
          cursor: pointer;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          margin-left: 8px;
          flex-shrink: 0;
          padding: 0;
        }

        .sb-item-delete:hover {
          background: rgba(234, 84, 85, 0.08);
          color: #ea5455;
        }

        .sb-item:hover .sb-item-delete,
        .sb-item.active .sb-item-delete {
          opacity: 1;
        }

        .sb-foot {
          flex-shrink: 0;
          padding: 8px;
          border-top: 1px solid var(--bdr);
        }

        .user-row {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s;
        }

        .user-row:hover {
          background: var(--surf2);
        }

        .sb-actions {
          display: grid;
          gap: 8px;
          margin-top: 12px;
          padding: 0 8px 10px;
        }

        .sb-action-btn {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          background: var(--surf2);
          border: 1px solid var(--bdr);
          color: var(--txt);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.16s, color 0.16s;
        }

        .sb-action-btn:hover {
          background: var(--surf);
        }

        .sb-action-logout {
          color: var(--red);
          border-color: rgba(234, 84, 85, 0.16);
        }

        .sb-action-logout:hover {
          background: rgba(234, 84, 85, 0.08);
        }

        .u-av {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: var(--acc);
          background: var(--acc);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .u-name {
          font-size: 12.5px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .u-email {
          font-size: 11px;
          color: var(--txt3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        /* Settings Modal Overlay & Layout */
        .settings-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          display: grid;
          place-items: center;
          z-index: 1000;
          padding: 24px;
          animation: modalFadeIn 0.2s ease-out;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .settings-modal {
          display: flex;
          width: 820px;
          height: 580px;
          max-width: 100%;
          max-height: 100%;
          background: var(--surf);
          border: 1px solid var(--bdr);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: var(--shd);
          animation: modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Sidebar Styling inside modal */
        .settings-sidebar-pane {
          width: 250px;
          background: var(--surf);
          border-right: 1px solid var(--bdr);
          display: flex;
          flex-direction: column;
          padding: 24px 18px;
          flex-shrink: 0;
        }

        .sidebar-brand {
          margin-bottom: 24px;
        }

        .sidebar-brand .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 16px;
          color: var(--txt);
        }

        .sidebar-sub {
          margin: 4px 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--txt2);
          font-weight: 500;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .nav-item {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: var(--txt2);
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
        }

        .nav-item:hover {
          background: var(--surf2);
          color: var(--txt);
        }

        .nav-item.active {
          background: var(--acc2);
          color: var(--acc);
          font-weight: 600;
        }

        .sidebar-footer {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--bdr);
        }

        .btn-close-settings {
          width: 100%;
          padding: 10px;
          background: var(--surf2);
          border: 1px solid var(--bdr);
          border-radius: 8px;
          font-size: 12.5px;
          color: var(--txt2);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.13s;
        }

        .btn-close-settings:hover {
          background: var(--bdr);
          color: var(--txt);
        }

        /* Content Area Styling inside modal */
        .settings-content {
          flex: 1;
          height: 100%;
          overflow-y: auto;
          background: var(--surf2);
          padding: 36px 40px;
          position: relative;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 20px;
          border: none;
          background: transparent;
          color: var(--txt2);
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          transition: all 0.12s;
        }

        .modal-close:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--txt);
        }

        .content-pane {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .pane-header h1 {
          margin: 0 0 6px;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .pane-header p {
          margin: 0;
          color: var(--txt2);
          font-size: 13.5px;
        }

        .pane-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pane-section h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .border-top {
          border-top: 1px solid var(--bdr);
          padding-top: 24px;
        }

        /* Profile pane specifics */
        .profile-identity {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .profile-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--acc) 0%, var(--accH) 100%);
          color: #fff;
          font-weight: 700;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px var(--acc2);
        }

        .profile-identity h2 {
          margin: 0 0 2px;
          font-size: 16px;
        }

        .profile-identity p {
          margin: 0;
          font-size: 12.5px;
          color: var(--txt2);
        }

        .profile-details-card {
          background: var(--surf);
          border: 1px solid var(--bdr);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.02);
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .detail-item span {
          font-size: 12px;
          font-weight: 500;
          color: var(--txt2);
        }

        .detail-item strong {
          font-size: 14.5px;
          color: var(--txt);
        }

        /* Status card */
        .status-card {
          background: var(--surf);
          border: 1px solid var(--bdr);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.02);
        }

        .status-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .badge-free {
          align-self: flex-start;
          background: var(--acc2);
          color: var(--acc);
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 5px;
        }

        .status-header p {
          margin: 0;
          font-size: 12.5px;
          color: var(--txt2);
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          border-top: 1px solid var(--bdr);
          padding-top: 14px;
        }

        .status-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .status-stat span {
          font-size: 11px;
          color: var(--txt2);
        }

        .status-stat strong {
          font-size: 14px;
          color: var(--txt);
        }

        .btn-danger {
          background: transparent;
          border: 1px solid rgba(234, 84, 85, 0.3);
          color: #ea5455;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-danger:hover {
          background: rgba(234, 84, 85, 0.08);
          border-color: #ea5455;
        }

        /* Legal links specifics */
        .legal-links-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .legal-card-item {
          background: var(--surf);
          border: 1px solid var(--bdr);
          border-radius: 16px;
          padding: 16px;
          color: var(--txt);
          text-decoration: none;
          transition: border-color 0.15s, transform 0.15s;
        }

        .legal-card-item:hover {
          border-color: var(--acc);
          transform: translateY(-1px);
        }

        .legal-card-item h3 {
          margin: 0 0 4px;
          font-size: 14px;
          font-weight: 600;
        }

        .legal-card-item p {
          margin: 0;
          font-size: 12.5px;
          color: var(--txt2);
          line-height: 1.5;
        }

        .danger-zone-card {
          border: 1px solid rgba(234, 84, 85, 0.2);
          background: rgba(234, 84, 85, 0.02);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .danger-zone-card h3 {
          margin: 0 0 4px;
          font-size: 14.5px;
          color: #ea5455;
        }

        .danger-zone-card p {
          margin: 0;
          font-size: 12.5px;
          color: var(--txt2);
          line-height: 1.5;
        }

        .main-panel {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .topbar {
          height: 48px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 16px;
          border-bottom: 1px solid var(--bdr);
        }

        .topbar-brand {
          display: none;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: var(--txt);
          margin-right: auto;
        }

        .mobile-menu-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: var(--txt2);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }

        .mobile-menu-btn:hover {
          background: var(--surf2);
          color: var(--txt);
        }

        .mobile-sidebar-backdrop {
          display: none;
        }

        .doc-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px 5px 8px;
          background: var(--surf2);
          border: 1px solid var(--bdr);
          border-radius: 100px;
          font-size: 12px;
          font-weight: 500;
          color: var(--txt2);
          cursor: pointer;
          max-width: 260px;
          overflow: hidden;
        }

        .doc-chip span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tb-avatar {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: var(--acc);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-left: auto;
        }

        .content-area {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .msgs-scroller {
          flex: 1;
          overflow-y: auto;
          scroll-behavior: smooth;
        }

        .msgs-scroller::-webkit-scrollbar {
          width: 5px;
        }

        .msgs-scroller::-webkit-scrollbar-thumb {
          background: var(--bdr);
          border-radius: 4px;
        }

        .msgs-col {
          max-width: 700px;
          margin: 0 auto;
          padding: 28px 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .msg-user {
          display: flex;
          justify-content: flex-end;
          padding: 6px 0;
        }

        .msg-user-inner {
          max-width: 72%;
        }

        .msg-user-bubble {
          background: var(--user-bg, oklch(0.16 0.02 278));
          color: var(--user-txt, var(--txt));
          padding: 10px 15px;
          border-radius: 18px 18px 4px 18px;
          font-size: 15px;
          line-height: 1.55;
          word-break: break-word;
        }

        .msg-ts {
          font-size: 10.5px;
          color: var(--txt3);
          margin-top: 4px;
          text-align: right;
          padding-right: 2px;
        }

        .msg-ai {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px 0 6px;
        }

        .ai-av {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: var(--acc);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .ai-content {
          flex: 1;
          min-width: 0;
        }

        .ai-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--acc);
          letter-spacing: 0.02em;
          margin-bottom: 6px;
        }

        .ai-prose {
          font-size: 15px;
          line-height: 1.75;
          color: var(--txt);
          word-break: break-word;
        }

        .ai-prose strong {
          font-weight: 600;
        }

        .ai-list-item {
          display: flex;
          gap: 10px;
          margin: 5px 0;
        }

        .ai-list-num {
          color: var(--acc);
          font-weight: 600;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          padding-top: 2px;
          min-width: 18px;
        }

        .ai-citations-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .ai-citation {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          background: var(--acc2);
          border: 1px solid var(--acc3);
          border-radius: 7px;
          font-size: 11.5px;
          color: var(--acc);
          font-family: 'DM Mono', monospace;
          cursor: pointer;
          transition: all 0.13s;
        }

        .ai-citation:hover {
          background: var(--acc3);
        }

        .ai-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .ai-action-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
        }

        .action-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid var(--bdr);
          color: var(--txt2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .action-icon-btn:hover {
          background: var(--surf2);
          color: var(--txt);
          border-color: var(--txt2);
        }

        .action-icon-btn.active-like {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.4);
        }

        .action-icon-btn.active-dislike {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.4);
        }

        .share-menu-container {
          position: relative;
        }

        .share-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 900;
          background: transparent;
        }

        .share-dropdown-menu {
          position: absolute;
          bottom: 34px;
          right: 0;
          background: var(--surf);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          padding: 4px;
          min-width: 110px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          gap: 2px;
          z-index: 901;
        }

        .share-menu-item {
          padding: 6px 12px;
          font-size: 13px;
          color: var(--txt2);
          border-radius: 6px;
          transition: all 0.12s;
          display: block;
          text-align: left;
          cursor: pointer;
          background: none;
          border: none;
          width: 100%;
          font-family: inherit;
        }

        .share-menu-item:hover {
          background: var(--surf2);
          color: var(--txt);
        }

        .empty-state-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 28px 20px;
          gap: 24px;
        }

        .drop-zone {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          border: 1.5px dashed var(--bdr);
          border-radius: 14px;
          padding: 28px 20px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.18s;
        }

        .drop-zone:hover,
        .drop-zone.drag-over {
          border-color: var(--acc);
          background: var(--acc2);
        }

        .drop-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--acc2);
          border: 1px solid var(--acc3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          color: var(--acc);
        }

        .drop-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 3px;
        }

        .drop-sub {
          font-size: 12.5px;
          color: var(--txt2);
        }

        .suggestions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .sugg-btn {
          text-align: left;
          background: var(--surf);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          padding: 10px 13px;
          color: var(--txt2);
          font-size: 13px;
          line-height: 1.4;
          transition: all 0.13s;
          cursor: pointer;
        }

        .sugg-btn:hover {
          border-color: var(--acc3);
          background: var(--acc2);
          color: var(--txt);
        }

        .input-area {
          flex-shrink: 0;
          padding: 8px 20px 14px;
        }

        .input-wrap {
          max-width: 700px;
          margin: 0 auto;
          background: var(--surf);
          border: 1px solid var(--bdr);
          border-radius: 14px;
          padding: 6px 6px 6px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .input-wrap:focus-within {
          border-color: var(--acc);
          box-shadow: 0 0 0 3px var(--acc2);
        }

        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          width: 100%;
        }

        .input-file-preview {
          display: flex;
          align-items: center;
          padding-top: 4px;
        }

        .file-chip {
          display: inline-flex;
          align-items: center;
          background: var(--surf2);
          border: 1px solid var(--bdr);
          border-radius: 8px;
          padding: 4px 8px 4px 10px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--txt);
          max-width: 100%;
        }

        .file-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 320px;
        }

        .clear-file-btn {
          background: transparent;
          border: none;
          color: var(--txt3);
          font-size: 16px;
          line-height: 1;
          margin-left: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          transition: all 0.12s;
          padding: 0;
        }

        .clear-file-btn:hover {
          background: rgba(234, 84, 85, 0.1);
          color: #ea5455;
        }

        .input-file-error {
          display: inline-flex;
          align-items: center;
          background: rgba(234, 84, 85, 0.08);
          border: 1px solid rgba(234, 84, 85, 0.2);
          border-radius: 8px;
          padding: 4px 8px 4px 10px;
          font-size: 12.5px;
          font-weight: 500;
          color: #ea5455;
          margin-top: 4px;
          align-self: flex-start;
        }

        .error-icon {
          margin-right: 6px;
          font-size: 11px;
        }

        .error-msg {
          flex: 1;
        }

        .clear-error-btn {
          background: transparent;
          border: none;
          color: #ea5455;
          font-size: 16px;
          line-height: 1;
          margin-left: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          transition: all 0.12s;
          padding: 0;
        }

        .clear-error-btn:hover {
          background: rgba(234, 84, 85, 0.15);
        }

        .inp-ta {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--txt);
          font-size: 15px;
          line-height: 1.55;
          padding: 10px 0;
          resize: none;
          max-height: 180px;
          overflow-y: auto;
        }

        .inp-ta::placeholder {
          color: var(--txt3);
        }

        .attach-btn {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          color: var(--txt3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 5px;
          transition: all 0.13s;
        }

        .attach-btn:hover {
          color: var(--txt2);
          background: var(--surf2);
        }

        .send-btn {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: var(--acc);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-bottom: 4px;
          transition: all 0.15s;
          padding: 0 !important;
          border: none;
          cursor: pointer;
        }

        .send-btn:disabled {
          opacity: 0.28;
          cursor: not-allowed;
        }

        .send-btn:not(:disabled):hover {
          background: var(--accH);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px var(--acc2);
        }

        .send-btn svg {
          display: block;
          width: 16px;
          height: 16px;
        }

        .input-hint {
          max-width: 700px;
          margin: 5px auto 0;
          font-size: 11.5px;
          color: var(--txt3);
          text-align: center;
        }

        .input-hint a,
        .hint-link {
          color: var(--acc);
          cursor: pointer;
          border: none;
          background: transparent;
          font: inherit;
          padding: 0;
        }

        .hint-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 800px) {
          .documind-app {
            flex-direction: column;
          }

          .sidebar {
            position: absolute;
            height: 100vh;
            z-index: 20;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12);
          }

          .sidebar.closed {
            width: 0;
          }

          .main-panel {
            width: 100%;
          }

          .suggestions {
            grid-template-columns: 1fr;
          }

          .mobile-menu-btn {
            display: flex;
            margin-right: 8px;
          }

          .topbar-brand {
            display: block;
          }

          .mobile-sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(2px);
            z-index: 15;
          }
        }

        @media (max-width: 680px) {
          /* Settings Modal Responsive Adjustments */
          .settings-modal {
            flex-direction: column;
            width: 100%;
            height: 100%;
            border-radius: 0;
            border: none;
          }

          .settings-sidebar-pane {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--bdr);
            padding: 16px 20px;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .settings-sidebar-pane .sidebar-brand {
            margin-bottom: 0;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .settings-sidebar-pane .sidebar-brand .sidebar-sub {
            display: none;
          }

          .settings-sidebar-pane .sidebar-nav {
            display: flex;
            flex-direction: row;
            gap: 10px;
            margin-bottom: 0;
            flex: none;
          }

          .settings-sidebar-pane .sidebar-footer {
            display: none;
          }

          .settings-sidebar-pane .nav-item {
            padding: 6px 12px;
            margin-bottom: 0;
            font-size: 13px;
            width: auto;
          }

          .settings-content {
            padding: 24px 20px;
          }

          .modal-close {
            top: 10px;
            right: 10px;
          }
        }

        @media (max-width: 640px) {
          .topbar {
            padding: 0 10px;
          }

          .doc-chip {
            display: inline-flex;
            max-width: 120px;
            font-size: 11px;
            padding: 4px 8px;
          }

          .msgs-col {
            padding: 20px 16px 10px;
          }

          .input-area {
            padding: 6px 12px 12px;
          }
        }

        /* Thinking Process Loader CSS */
        .thinking-container {
          margin: 6px 0 12px;
          border-radius: 12px;
          border: 1px solid var(--bdr);
          background: var(--surf);
          overflow: hidden;
          max-width: 100%;
          font-family: inherit;
        }

        .thinking-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: var(--txt2);
          text-align: left;
        }

        .thinking-toggle:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        .thinking-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .thinking-logo {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          background: var(--acc);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .thinking-header-text {
          font-size: 13.5px;
          color: var(--txt);
        }

        /* Pulse loader */
        .thinking-pulse-loader {
          display: flex;
          gap: 4px;
        }

        .thinking-pulse-loader .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--acc);
          animation: pulseDot 1.4s infinite ease-in-out both;
        }

        .thinking-pulse-loader .dot:nth-child(1) { animation-delay: -0.32s; }
        .thinking-pulse-loader .dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes pulseDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
        }

        .thinking-check-icon {
          color: #10b981;
          font-weight: bold;
          font-size: 14px;
        }

        .thinking-details {
          padding: 8px 14px 12px;
          border-top: 1px solid var(--bdr);
          background: var(--surf2);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .thinking-step-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          color: var(--txt2);
        }

        .thinking-step-row.done {
          color: var(--txt);
        }

        .thinking-step-row.running {
          color: var(--acc);
          font-weight: 500;
        }

        .thinking-step-row.failed {
          color: #ef4444;
        }

        .step-bullet {
          width: 14px;
          height: 14px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .step-done {
          color: #10b981;
          font-weight: bold;
          font-size: 12px;
        }

        .step-failed {
          color: #ef4444;
          font-weight: bold;
          font-size: 14px;
        }

        .step-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--txt3);
        }

        /* Tiny step rotating spinner */
        .step-loader {
          width: 10px;
          height: 10px;
          border: 1.5px solid var(--acc);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Indexed badge next to preview file chip */
        .indexed-badge {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
          margin-left: 8px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }


        /* Typing animation loader */
        .typing-loader {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          margin-left: 6px;
          vertical-align: middle;
          height: 14px;
        }

        .typing-loader .dot {
          width: 5px;
          height: 5px;
          background-color: var(--acc);
          border-radius: 50%;
          animation: typingBounce 1.2s infinite ease-in-out both;
        }

        .typing-loader .dot:nth-child(1) { animation-delay: -0.3s; }
        .typing-loader .dot:nth-child(2) { animation-delay: -0.15s; }
        .typing-loader .dot:nth-child(3) { animation-delay: 0s; }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }

      `}</style>
      {toastMessage && (
        <div className="toast-notification">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </section>
  )
}
