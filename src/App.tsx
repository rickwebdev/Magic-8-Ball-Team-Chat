import { useState, useRef, useEffect } from 'react'
import { responses } from './data/responses'
import {
  getSynergyReply,
  getNinjaPMReply,
  getNinjaPMFollowUp,
  getScapegoatReply,
  getGrowthGuruReply,
  getGroupChatReply,
  nextMemeFilename,
} from './characters'
import { CREDIT_LINK, isEasterEggCreditQuestion } from './orchestration/easterEgg'
import { computeTotalUserMessages } from './orchestration/globalCounter'
import { MIN_TYPING_MS, ensureMinMsSince } from './lib/chatTiming'
import './App.css'
import teamsCallSound from './assets/audio/teams_call.mp3'
import endCallSound from './assets/audio/end_call.mp3'
import speakingSound from './assets/audio/speaking.mp3'
import newMessageSound from './assets/audio/new_message.mp3'

type ChatKey = 'synergy' | 'ninja' | 'group' | 'blue' | 'growth' | 'goose' | 'meme' | 'scapegoat'

function Magic8BallIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#22232a" stroke="#fff" strokeWidth="2"/>
      <circle cx="20" cy="20" r="10" fill="#191970" stroke="#fff" strokeWidth="1.5"/>
      <polygon points="20,13 26,27 14,27" fill="#fff"/>
      <text x="20" y="24.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#191970">8</text>
    </svg>
  )
}

const sidebarChatsBase = [
  { key: 'synergy', name: 'Synergy Bot', avatar: <Magic8BallIcon size={32} /> },
  { key: 'meme', name: 'Meme Guy', avatar: '😎' },
  { key: 'scapegoat', name: 'Scapegoat', avatar: '🐐' },
  { key: 'ninja', name: 'Ninja PM', avatar: '🥷' },
  { key: 'growth', name: 'Growth Guru', avatar: '🦖' },
]

const INPUT_PLACEHOLDER: Record<ChatKey, string> = {
  synergy: 'Ask for a decision...',
  meme: 'Say anything...',
  scapegoat: 'Tell him what went wrong...',
  ninja: 'Give him a status update...',
  growth: 'Describe a setback...',
  group: 'Loop in the team...',
  blue: 'Type a message...',
  goose: 'Type a message...',
}

function UserAvatarBubble() {
  return (
    <span className="avatar user user-avatar-emoji" aria-label="You">
      🤦
    </span>
  )
}

function UserAvatarInput() {
  return (
    <span className="avatar user user-avatar-emoji user-avatar-emoji--input" aria-hidden>
      🤦
    </span>
  )
}

function SidebarPresenceAvatar({
  chatKey,
  children,
  listAvatar,
}: {
  chatKey: ChatKey
  children: React.ReactNode
  /** Larger avatar styling for mobile chat list */
  listAvatar?: boolean
}) {
  const away = chatKey === 'scapegoat'
  return (
    <span className={`sidebar-avatar-wrap${listAvatar ? ' sidebar-avatar-wrap--list' : ''}`}>
      <span className={listAvatar ? 'mobile-chat-list-avatar' : 'avatar'}>{children}</span>
      <span
        className={`presence-dot ${away ? 'presence-away' : 'presence-online'}`}
        aria-hidden
      />
    </span>
  )
}

function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="about-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="about-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="about-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="about-modal-title" className="about-modal-title">
          Magic 8-Ball Team Chat
        </h2>
        <p className="about-modal-body">
          A satirical Microsoft Teams parody populated by the coworkers you&apos;ve definitely never met.
          Each character is powered by a persona-specific system prompt. Replies reference what you actually
          say; the absurdity is intentional.
        </p>
        <h3 className="about-modal-heading">How it&apos;s built</h3>
        <ul className="about-modal-list">
          <li>Vite + React + TypeScript</li>
          <li>OpenAI API (GPT-4o) with per-character system prompts</li>
          <li>
            Two-layer architecture: deterministic orchestration layer (call popup, badge logic, typing
            indicators, message counters) + LLM copy layer (character reply generation)
          </li>
          <li>
            Character outcomes like Synergy Bot&apos;s yes/no/maybe/ghosted bucket are selected in code; the
            LLM only phrases the result
          </li>
          <li>Static fallback responses on API failure</li>
          <li>
            Deployed on Vercel at{' '}
            <a href={`${import.meta.env.BASE_URL}`} target="_blank" rel="noopener noreferrer">
              {import.meta.env.BASE_URL}
            </a>
          </li>
        </ul>
        <p className="about-modal-footer">
          Built by Rick ·{' '}
          <a href="https://rickthewebdev.com/" target="_blank" rel="noopener noreferrer">
            rickthewebdev.com
          </a>
        </p>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      <span className="typing-text">Typing...</span>
    </div>
  )
}

function TeamsWindowBar({ onAboutClick }: { onAboutClick: () => void }) {
  return (
    <div className="teams-window-bar">
      <div className="teams-window-bar-left">
        <span className="window-dot red" />
        <span className="window-dot yellow" />
        <span className="window-dot green" />
      </div>
      <div className="teams-window-bar-center">
        <span className="app-title-windowbar">Magic 8-Ball Team Chat</span>
        <span className="app-tagline">The workplace messaging experience.</span>
      </div>
      <div className="teams-window-bar-right">
        <button type="button" className="about-btn-window" onClick={onAboutClick}>
          About this app
        </button>
      </div>
    </div>
  )
}

// Add custom properties to window for TypeScript
declare global {
  interface Window {
    gtagScriptLoaded?: boolean;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function App() {
  const [activeChat, setActiveChat] = useState<ChatKey>('synergy')
  const [synergyHistory, setSynergyHistory] = useState<{q: string, a: string | null}[]>([])
  const [ninjaHistory, setNinjaHistory] = useState<{q: string | null, a: string | null}[]>([])
  const [groupHistory, setGroupHistory] = useState<{q: string, a: string | null}[]>([])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showNinjaBadge, setShowNinjaBadge] = useState(false)
  const [groupChatOpen, setGroupChatOpen] = useState(false)
  const [showCallPopup, setShowCallPopup] = useState(false)
  const [callAnswered, setCallAnswered] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endAudioRef = useRef<HTMLAudioElement | null>(null)
  const speakingAudioRef = useRef<HTMLAudioElement | null>(null)
  const [memeHistory, setMemeHistory] = useState<{q: string, a: string | null}[]>([])
  const [usedMemes, setUsedMemes] = useState<string[]>([])
  const [scapegoatHistory, setScapegoatHistory] = useState<{q: string, a: string | null}[]>([])
  const [growthHistory, setGrowthHistory] = useState<{q: string, a: string | null}[]>([])
  const [lastPMFollowUp, setLastPMFollowUp] = useState(0)
  const [pmBadgeCount, setPmBadgeCount] = useState(0)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const emojiOptions = ['😀','😁','😂','😍','😎','😢','😡','👍','🙌','🎉']
  const isMobile = window.innerWidth < 700
  const [showChatList, setShowChatList] = useState(isMobile)
  const newMessageAudioRef = useRef<HTMLAudioElement | null>(null)
  /** Last message the user sent in Ninja PM only; used for injected PM follow-ups (not other chats). */
  const lastNinjaUserMessageRef = useRef('')

  useEffect(() => {
    // Google Analytics gtag.js
    if (!window.gtagScriptLoaded) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-DXTYL1RNBC';
      document.head.appendChild(script);
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: unknown[]) {
        window.dataLayer!.push(args);
      }
      window.gtag = gtag;
      window.gtag('js', new Date());
      window.gtag('config', 'G-DXTYL1RNBC');
      window.gtagScriptLoaded = true;
    }
  }, []);

  const totalUserMessages = computeTotalUserMessages(
    synergyHistory.length,
    memeHistory.length,
    scapegoatHistory.length,
    ninjaHistory.length,
    groupHistory.length,
    growthHistory.length,
  )
  // Show badge after 4 total user messages
  if (!showNinjaBadge && totalUserMessages >= 4 && !groupChatOpen) {
    setShowNinjaBadge(true)
  }

  // Show call popup after group chat opens
  if (groupChatOpen && !showCallPopup && !callAnswered) {
    setTimeout(() => setShowCallPopup(true), 800)
  }

  // Sidebar chat list, add group chat if open
  const sidebarChats = groupChatOpen
    ? [
        ...sidebarChatsBase,
        {
          key: 'group',
          name: 'SYNERGY Group Chat',
          avatar: <span style={{ fontSize: 22, marginLeft: 2 }}>👥</span>,
        },
      ]
    : sidebarChatsBase

  // Handle sidebar click
  const handleSidebarClick = (key: string) => {
    if (key === 'ninja') {
      setActiveChat('ninja')
      setShowNinjaBadge(false)
    } else if (key === 'synergy') {
      setActiveChat('synergy')
    } else if (key === 'group') {
      setActiveChat('group')
    } else if (key === 'meme') {
      setActiveChat('meme')
    } else if (key === 'scapegoat') {
      setActiveChat('scapegoat')
    } else if (key === 'growth') {
      setActiveChat('growth')
    }
  }

  const handleSynergySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const q = question.trim()
    if (isEasterEggCreditQuestion(q)) {
      setSynergyHistory([...synergyHistory, { q, a: CREDIT_LINK }])
      setQuestion('')
      return
    }
    setIsLoading(true)
    setSynergyHistory([...synergyHistory, { q, a: null }])
    setQuestion('')
    setTimeout(() => {
      setSynergyHistory((history) => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      const typingAt = Date.now()
      void (async () => {
        const text = await getSynergyReply(q)
        await ensureMinMsSince(typingAt, MIN_TYPING_MS)
        setSynergyHistory((history) => {
          const updated = [...history]
          updated[updated.length - 1].a = text
          return updated
        })
        setIsLoading(false)
      })()
    }, 100)
  }

  const handleNinjaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const q = question.trim()
    if (isEasterEggCreditQuestion(q)) {
      setNinjaHistory([...ninjaHistory, { q, a: CREDIT_LINK }])
      setQuestion('')
      return
    }
    lastNinjaUserMessageRef.current = q
    setNinjaHistory([...ninjaHistory, { q, a: null }])
    setQuestion('')
    setTimeout(() => {
      setNinjaHistory((history) => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      const typingAt = Date.now()
      void (async () => {
        const text = await getNinjaPMReply(q)
        await ensureMinMsSince(typingAt, MIN_TYPING_MS)
        setNinjaHistory((history) => {
          const updated = [...history]
          updated[updated.length - 1].a = text
          return updated
        })
        setShowCallPopup(true)
        setCallAnswered(false)
      })()
    }, 100)
  }

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const q = question.trim()
    if (isEasterEggCreditQuestion(q)) {
      setGroupHistory([...groupHistory, { q, a: CREDIT_LINK }])
      setQuestion('')
      return
    }
    setIsLoading(true)
    setGroupHistory([...groupHistory, { q, a: null }])
    setQuestion('')
    setTimeout(() => {
      setGroupHistory((history) => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      const typingAt = Date.now()
      void (async () => {
        const text = await getGroupChatReply(q)
        await ensureMinMsSince(typingAt, MIN_TYPING_MS)
        setGroupHistory((history) => {
          const updated = [...history]
          updated[updated.length - 1].a = text
          return updated
        })
        setIsLoading(false)
      })()
    }, 100)
  }

  // Accept call: open group chat, video modal, and trigger looping message
  const handleCallAnswer = () => {
    setShowCallPopup(false)
    setCallAnswered(true)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setGroupChatOpen(true)
    setActiveChat('group')
    setShowVideoModal(true)
    setGroupHistory([{ q: '', a: null }, ...groupHistory])
  }

  // Stop call sound and play end sound on answer/hangup
  const handleCallHangup = () => {
    setShowCallPopup(false)
    setCallAnswered(true)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (endAudioRef.current) {
      endAudioRef.current.currentTime = 0
      endAudioRef.current.play()
    }
  }

  // Play call sound when call popup appears
  useEffect(() => {
    if (showCallPopup && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
    }
  }, [showCallPopup])

  // Play/stop speaking sound when video modal opens/closes
  useEffect(() => {
    if (showVideoModal && speakingAudioRef.current) {
      speakingAudioRef.current.currentTime = 0
      speakingAudioRef.current.loop = true
      speakingAudioRef.current.play()
    } else if (!showVideoModal && speakingAudioRef.current) {
      speakingAudioRef.current.pause()
      speakingAudioRef.current.currentTime = 0
    }
  }, [showVideoModal])

  // Video chat grid users
  const animalEmojis = ['🦊','🐻','🐼','🐨','🐯','🦁','🐵','🐸','🐷','🐮','🐔','🦄','🐙','🦉','🦓','🦒','🦔','🦦','🦥','🦛','🦘','🦡','🦢','🦚','🦜','🦩','🦤','🦭','🦦','🦨','🦫','🦃','🦆','🦅','🦇','🐧','🐦','🐤','🐣','🐥','🦆','🦢','🦉','🦚','🦜','🦩','🦤','🦭','🦦','🦨','🦫']
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const shuffledAnimals = shuffle(animalEmojis)
  const videoUsers = [
    { name: 'Ninja PM', avatar: '🥷', talking: true },
    { name: 'Synergy Bot', avatar: <Magic8BallIcon size={32} />, talking: false },
    { name: 'Blue Sky', avatar: '🐧', talking: false },
    { name: 'Growth Guru', avatar: '🦖', talking: false },
    { name: 'Goose', avatar: '🦢', talking: false },
    { name: 'You', avatar: <span className="video-user-emoji">🤦</span>, talking: false },
    // Fill up to 16 users with random animals
    ...Array.from({ length: 10 }, (_, i) => ({ name: `User ${i+1}`, avatar: shuffledAnimals[i % shuffledAnimals.length], talking: false }))
  ]

  // Leave video modal with end call sound
  const handleVideoLeave = () => {
    if (endAudioRef.current) {
      endAudioRef.current.currentTime = 0
      endAudioRef.current.play()
    }
    if (speakingAudioRef.current) {
      speakingAudioRef.current.pause()
      speakingAudioRef.current.currentTime = 0
    }
    setGroupHistory(history => ([
      ...history,
      { q: 'You left the chat.', a: null }
    ]))
    setTimeout(() => setShowVideoModal(false), 500)
  }

  const handleMemeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const q = question.trim()
    if (isEasterEggCreditQuestion(q)) {
      setMemeHistory([...memeHistory, { q, a: CREDIT_LINK }])
      setQuestion('')
      return
    }
    setIsLoading(true)
    setMemeHistory([...memeHistory, { q, a: null }])
    setQuestion('')
    setTimeout(() => {
      setMemeHistory((history) => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      setTimeout(() => {
        const { filename, usedNext } = nextMemeFilename(usedMemes)
        setUsedMemes(usedNext)
        setMemeHistory((history) => {
          const updated = [...history]
          updated[updated.length - 1].a = filename
          return updated
        })
        setIsLoading(false)
      }, 1000)
    }, 100)
  }

  const handleScapegoatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const q = question.trim()
    if (isEasterEggCreditQuestion(q)) {
      setScapegoatHistory([...scapegoatHistory, { q, a: CREDIT_LINK }])
      setQuestion('')
      return
    }
    setIsLoading(true)
    setScapegoatHistory([...scapegoatHistory, { q, a: null }])
    setQuestion('')
    setTimeout(() => {
      setScapegoatHistory((history) => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      const typingAt = Date.now()
      void (async () => {
        const text = await getScapegoatReply(q)
        await ensureMinMsSince(typingAt, MIN_TYPING_MS)
        setScapegoatHistory((history) => {
          const updated = [...history]
          updated[updated.length - 1].a = text
          return updated
        })
        setIsLoading(false)
      })()
    }, 100)
  }

  const handleGrowthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const q = question.trim()
    if (isEasterEggCreditQuestion(q)) {
      setGrowthHistory([...growthHistory, { q, a: CREDIT_LINK }])
      setQuestion('')
      return
    }
    setIsLoading(true)
    setGrowthHistory([...growthHistory, { q, a: null }])
    setQuestion('')
    setTimeout(() => {
      setGrowthHistory((history) => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      const typingAt = Date.now()
      void (async () => {
        const text = await getGrowthGuruReply(q)
        await ensureMinMsSince(typingAt, MIN_TYPING_MS)
        setGrowthHistory((history) => {
          const updated = [...history]
          updated[updated.length - 1].a = text
          return updated
        })
        setIsLoading(false)
      })()
    }, 100)
  }

  // Add this helper for inserting emoji at cursor
  const inputRef = useRef<HTMLInputElement | null>(null)
  const insertEmoji = (emoji: string) => {
    if (inputRef.current) {
      const input = inputRef.current
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const value = question
      const newValue = value.slice(0, start) + emoji + value.slice(end)
      setQuestion(newValue)
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    }
  }

  // Render chat content based on activeChat
  let chatContent
  let chatForm
  if (activeChat === 'synergy') {
    chatContent = (
      <>
        <div className="message bot-message">
          <span className="avatar bot"><Magic8BallIcon size={32} /></span>
          <div className="bubble bot">
            <div className="message-content">{responses.prompt}</div>
          </div>
        </div>
        {synergyHistory.map((item, i) => (
          <>
            <div key={`user-${i}`} className="message user-message">
              <div className="bubble user">
                <div className="message-content">{item.q}</div>
              </div>
              <UserAvatarBubble />
            </div>
            {item.a === 'typing' && (
              <div key={`typing-${i}`} className="message bot-message">
                <span className="avatar bot"><Magic8BallIcon size={32} /></span>
                <div className="bubble bot">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {item.a && item.a !== 'typing' && (
              <div key={`bot-${i}`} className="message bot-message">
                <span className="avatar bot"><Magic8BallIcon size={32} /></span>
                <div className="bubble bot">
                  <div className="message-content">
                    {item.a === CREDIT_LINK ? (
                      <a href={CREDIT_LINK} target="_blank" rel="noopener noreferrer">{CREDIT_LINK}</a>
                    ) : (
                      item.a
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ))}
      </>
    )
    chatForm = (
      <form onSubmit={handleSynergySubmit} className="input-form" style={{ position: 'relative' }}>
        <button
          type="button"
          className="emoji-selector-btn input-emoji-btn"
          title="Insert emoji"
          tabIndex={0}
          onClick={e => { e.preventDefault(); setShowEmojiPicker(v => !v) }}
        >
          <UserAvatarInput />
        </button>
        {showEmojiPicker && (
          <div className="emoji-picker-popover">
            {emojiOptions.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="emoji-picker-emoji"
                onClick={e => { e.preventDefault(); insertEmoji(emoji); setShowEmojiPicker(false) }}
                tabIndex={0}
              >
                <span role="img" aria-label="emoji">{emoji}</span>
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={INPUT_PLACEHOLDER.synergy}
          className="question-input"
          ref={inputRef}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading || !question.trim()}
          aria-label="Send"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 20L21 12L3 4V10L17 12L3 14V20Z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    )
  } else if (activeChat === 'ninja') {
    chatContent = (
      <>
        <div className="message bot-message">
          <span className="avatar bot">🥷</span>
          <div className="bubble bot">
            <div className="message-content">What is the status?</div>
          </div>
        </div>
        {ninjaHistory.map((item, i) => (
          <>
            {item.q && (
              <div key={`user-ninja-${i}`} className="message user-message">
                <div className="bubble user">
                  <div className="message-content">{item.q}</div>
                </div>
                <UserAvatarBubble />
              </div>
            )}
            {item.a === 'typing' && (
              <div key={`typing-ninja-${i}`} className="message bot-message">
                <span className="avatar bot">🥷</span>
                <div className="bubble bot">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {item.a && item.a !== 'typing' && (
              <div key={`bot-ninja-${i}`} className="message bot-message">
                <span className="avatar bot">🥷</span>
                <div className="bubble bot">
                  <div className="message-content">
                    {item.a === CREDIT_LINK ? (
                      <a href={CREDIT_LINK} target="_blank" rel="noopener noreferrer">{CREDIT_LINK}</a>
                    ) : (
                      item.a
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ))}
      </>
    )
    chatForm = (
      <form onSubmit={handleNinjaSubmit} className="input-form" style={{ position: 'relative' }}>
        <button
          type="button"
          className="emoji-selector-btn input-emoji-btn"
          title="Insert emoji"
          tabIndex={0}
          onClick={e => { e.preventDefault(); setShowEmojiPicker(v => !v) }}
        >
          <UserAvatarInput />
        </button>
        {showEmojiPicker && (
          <div className="emoji-picker-popover">
            {emojiOptions.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="emoji-picker-emoji"
                onClick={e => { e.preventDefault(); insertEmoji(emoji); setShowEmojiPicker(false) }}
                tabIndex={0}
              >
                <span role="img" aria-label="emoji">{emoji}</span>
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={INPUT_PLACEHOLDER.ninja}
          className="question-input"
          ref={inputRef}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!question.trim()}
          aria-label="Send"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 20L21 12L3 4V10L17 12L3 14V20Z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    )
  } else if (activeChat === 'group') {
    chatContent = (
      <>
        {activeChat === 'group' && (!isMobile) && (
          <div className="group-header-bar">
            <span className="avatar group-header-avatar">🥷</span>
            <span className="avatar group-header-overflow">+20</span>
            <span className="group-header-title">SYNERGY Group Chat</span>
          </div>
        )}
        <div className="message bot-message">
          <span className="avatar bot">🥷</span>
          <div className="bubble bot">
            <div className="sender-name">Ninja PM</div>
            <div className="message-content">
              Kicking off the thread: @You, let us align on ownership before the next standup.
            </div>
          </div>
        </div>
        {groupHistory.map((item, i) => (
          <>
            <div key={`user-${i}`} className="message user-message">
              <div className="bubble user">
                <div className="sender-name">You</div>
                <div className="message-content">{item.q}</div>
              </div>
              <UserAvatarBubble />
            </div>
            {item.a === 'typing' && (
              <div key={`typing-group-${i}`} className="message bot-message">
                <span className="avatar bot">🥷</span>
                <div className="bubble bot">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {item.a && item.a !== 'typing' && (
              <div key={`bot-group-${i}`} className="message bot-message">
                <span className="avatar bot">🥷</span>
                <div className="bubble bot">
                  <div className="sender-name">Ninja PM</div>
                  <div className="message-content">
                    {item.a === CREDIT_LINK ? (
                      <a href={CREDIT_LINK} target="_blank" rel="noopener noreferrer">{CREDIT_LINK}</a>
                    ) : (
                      item.a
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ))}
      </>
    )
    chatForm = (
      <form onSubmit={handleGroupSubmit} className="input-form" style={{ position: 'relative' }}>
        <button
          type="button"
          className="emoji-selector-btn input-emoji-btn"
          title="Insert emoji"
          tabIndex={0}
          onClick={e => { e.preventDefault(); setShowEmojiPicker(v => !v) }}
        >
          <UserAvatarInput />
        </button>
        {showEmojiPicker && (
          <div className="emoji-picker-popover">
            {emojiOptions.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="emoji-picker-emoji"
                onClick={e => { e.preventDefault(); insertEmoji(emoji); setShowEmojiPicker(false) }}
                tabIndex={0}
              >
                <span role="img" aria-label="emoji">{emoji}</span>
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={INPUT_PLACEHOLDER.group}
          className="question-input"
          ref={inputRef}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading || !question.trim()}
          aria-label="Send"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 20L21 12L3 4V10L17 12L3 14V20Z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    )
  } else if (activeChat === 'meme') {
    chatContent = (
      <>
        <div className="message bot-message">
          <span className="avatar bot">😎</span>
          <div className="bubble bot">
            <div className="message-content">Seen any good memes lately?</div>
          </div>
        </div>
        {memeHistory.map((item, i) => (
          <>
            <div key={`user-meme-${i}`} className="message user-message">
              <div className="bubble user">
                <div className="message-content">{item.q}</div>
              </div>
              <UserAvatarBubble />
            </div>
            {item.a === 'typing' && (
              <div key={`typing-meme-${i}`} className="message bot-message">
                <span className="avatar bot">😎</span>
                <div className="bubble bot">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {item.a && item.a !== 'typing' && (
              <div key={`bot-meme-${i}`} className="message bot-message">
                <span className="avatar bot">😎</span>
                <div className="bubble bot meme-bubble">
                  <img src={`${import.meta.env.BASE_URL}memes/${item.a}`} alt="meme" className="meme-img" onLoad={() => setTimeout(scrollToBottom, 10)} />
                </div>
              </div>
            )}
          </>
        ))}
      </>
    )
    chatForm = (
      <form onSubmit={handleMemeSubmit} className="input-form" style={{ position: 'relative' }}>
        <button
          type="button"
          className="emoji-selector-btn input-emoji-btn"
          title="Insert emoji"
          tabIndex={0}
          onClick={e => { e.preventDefault(); setShowEmojiPicker(v => !v) }}
        >
          <UserAvatarInput />
        </button>
        {showEmojiPicker && (
          <div className="emoji-picker-popover">
            {emojiOptions.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="emoji-picker-emoji"
                onClick={e => { e.preventDefault(); insertEmoji(emoji); setShowEmojiPicker(false) }}
                tabIndex={0}
              >
                <span role="img" aria-label="emoji">{emoji}</span>
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={INPUT_PLACEHOLDER.meme}
          className="question-input"
          ref={inputRef}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading || !question.trim()}
          aria-label="Send"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 20L21 12L3 4V10L17 12L3 14V20Z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    )
  } else if (activeChat === 'scapegoat') {
    chatContent = (
      <>
        <div className="message bot-message">
          <span className="avatar bot">🐐</span>
          <div className="bubble bot">
            <div className="message-content">How can I help (or not) today?</div>
          </div>
        </div>
        {scapegoatHistory.map((item, i) => (
          <>
            <div key={`user-scapegoat-${i}`} className="message user-message">
              <div className="bubble user">
                <div className="message-content">{item.q}</div>
              </div>
              <UserAvatarBubble />
            </div>
            {item.a === 'typing' && (
              <div key={`typing-scapegoat-${i}`} className="message bot-message">
                <span className="avatar bot">🐐</span>
                <div className="bubble bot">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {item.a && item.a !== 'typing' && (
              <div key={`bot-scapegoat-${i}`} className="message bot-message">
                <span className="avatar bot">🐐</span>
                <div className="bubble bot">
                  <div className="message-content">
                    {item.a === CREDIT_LINK ? (
                      <a href={CREDIT_LINK} target="_blank" rel="noopener noreferrer">{CREDIT_LINK}</a>
                    ) : (
                      item.a
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ))}
      </>
    )
    chatForm = (
      <form onSubmit={handleScapegoatSubmit} className="input-form" style={{ position: 'relative' }}>
        <button
          type="button"
          className="emoji-selector-btn input-emoji-btn"
          title="Insert emoji"
          tabIndex={0}
          onClick={e => { e.preventDefault(); setShowEmojiPicker(v => !v) }}
        >
          <UserAvatarInput />
        </button>
        {showEmojiPicker && (
          <div className="emoji-picker-popover">
            {emojiOptions.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="emoji-picker-emoji"
                onClick={e => { e.preventDefault(); insertEmoji(emoji); setShowEmojiPicker(false) }}
                tabIndex={0}
              >
                <span role="img" aria-label="emoji">{emoji}</span>
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={INPUT_PLACEHOLDER.scapegoat}
          className="question-input"
          ref={inputRef}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading || !question.trim()}
          aria-label="Send"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 20L21 12L3 4V10L17 12L3 14V20Z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    )
  } else if (activeChat === 'growth') {
    chatContent = (
      <>
        <div className="message bot-message">
          <span className="avatar bot">🦖</span>
          <div className="bubble bot">
            <div className="message-content">Ready to pivot, motivate, and celebrate your wins!</div>
          </div>
        </div>
        {growthHistory.map((item, i) => (
          <>
            <div key={`user-growth-${i}`} className="message user-message">
              <div className="bubble user">
                <div className="message-content">{item.q}</div>
              </div>
              <UserAvatarBubble />
            </div>
            {item.a === 'typing' && (
              <div key={`typing-growth-${i}`} className="message bot-message">
                <span className="avatar bot">🦖</span>
                <div className="bubble bot">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {item.a && item.a !== 'typing' && (
              <div key={`bot-growth-${i}`} className="message bot-message">
                <span className="avatar bot">🦖</span>
                <div className="bubble bot">
                  <div className="message-content">
                    {item.a === CREDIT_LINK ? (
                      <a href={CREDIT_LINK} target="_blank" rel="noopener noreferrer">{CREDIT_LINK}</a>
                    ) : (
                      item.a
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ))}
      </>
    )
    chatForm = (
      <form onSubmit={handleGrowthSubmit} className="input-form" style={{ position: 'relative' }}>
        <button
          type="button"
          className="emoji-selector-btn input-emoji-btn"
          title="Insert emoji"
          tabIndex={0}
          onClick={e => { e.preventDefault(); setShowEmojiPicker(v => !v) }}
        >
          <UserAvatarInput />
        </button>
        {showEmojiPicker && (
          <div className="emoji-picker-popover">
            {emojiOptions.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="emoji-picker-emoji"
                onClick={e => { e.preventDefault(); insertEmoji(emoji); setShowEmojiPicker(false) }}
                tabIndex={0}
              >
                <span role="img" aria-label="emoji">{emoji}</span>
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={INPUT_PLACEHOLDER.growth}
          className="question-input"
          ref={inputRef}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading || !question.trim()}
          aria-label="Send"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 20L21 12L3 4V10L17 12L3 14V20Z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    )
  }

  // Scroll chat-messages to bottom on update
  const chatMessagesRef = useRef<HTMLDivElement | null>(null)
  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }
  useEffect(() => {
    scrollToBottom()
  }, [synergyHistory, ninjaHistory, groupHistory, memeHistory, scapegoatHistory, growthHistory, activeChat, isLoading])

  // Extra: always scroll after render in Meme Guy chat
  useEffect(() => {
    if (activeChat === 'meme') {
      scrollToBottom()
    }
  })

  useEffect(() => {
    if (totalUserMessages > 0 && totalUserMessages % 4 === 0 && lastPMFollowUp !== totalUserMessages) {
      setLastPMFollowUp(totalUserMessages)
      setPmBadgeCount((count) => count + 1)
      setNinjaHistory((history) => [...history, { q: null, a: 'typing' }])
      const ctx = lastNinjaUserMessageRef.current
      const typingAt = Date.now()
      void (async () => {
        const text = await getNinjaPMFollowUp(ctx)
        await ensureMinMsSince(typingAt, MIN_TYPING_MS)
        setNinjaHistory((history) => {
          const updated = [...history]
          const last = updated[updated.length - 1]
          if (last && last.q === null && last.a === 'typing') {
            updated[updated.length - 1] = { q: null, a: text }
          }
          return updated
        })
        if (newMessageAudioRef.current) {
          newMessageAudioRef.current.currentTime = 0
          void newMessageAudioRef.current.play()
        }
      })()
    }
  }, [totalUserMessages, lastPMFollowUp])

  // Reset PM badge count when Ninja PM chat is selected
  useEffect(() => {
    if (activeChat === 'ninja' && pmBadgeCount > 0) {
      setPmBadgeCount(0)
    }
  }, [activeChat, pmBadgeCount])

  // Add click outside handler for emoji picker
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target instanceof HTMLElement)) return
      if (!e.target.closest('.emoji-picker-popover') && !e.target.closest('.input-emoji-btn')) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClick)
    } else {
      document.removeEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showEmojiPicker])

  if (isMobile && showChatList) {
    return (
      <div className="mobile-chat-list-modal">
        <div className="mobile-chat-list-header">
          <span className="mobile-chat-list-title">Chats</span>
          <button className="mobile-chat-list-close" onClick={() => setShowChatList(false)} aria-label="Close chat list">×</button>
        </div>
        <div className="mobile-chat-list-items">
          {sidebarChats.map((chat) => (
            <button
              key={chat.key}
              className="mobile-chat-list-item"
              onClick={() => { setActiveChat(chat.key as ChatKey); setShowChatList(false); }}
              style={{ position: 'relative' }}
            >
              <SidebarPresenceAvatar chatKey={chat.key as ChatKey} listAvatar>
                {chat.avatar}
              </SidebarPresenceAvatar>
              <span>{chat.name}</span>
              {chat.key === 'ninja' && pmBadgeCount > 0 && (
                <span className="mobile-badge">{pmBadgeCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <TeamsWindowBar onAboutClick={() => setShowAboutModal(true)} />
      <audio ref={audioRef} src={teamsCallSound} preload="auto" />
      <audio ref={endAudioRef} src={endCallSound} preload="auto" />
      <audio ref={speakingAudioRef} src={speakingSound} preload="auto" />
      <audio ref={newMessageAudioRef} src={newMessageSound} preload="auto" />
      <div className="teams-root">
        <aside className="sidebar">
          <div className="sidebar-chats">
            {sidebarChats.map((chat) => (
              <div
                key={chat.key}
                className={`sidebar-chat${activeChat === chat.key ? ' active' : ''}`}
                onClick={() => handleSidebarClick(chat.key)}
                style={{ position: 'relative' }}
              >
                <SidebarPresenceAvatar chatKey={chat.key as ChatKey}>{chat.avatar}</SidebarPresenceAvatar>
                <span className="chat-name">{chat.name}</span>
                {chat.key === 'ninja' && pmBadgeCount > 0 && (
                  <span className="sidebar-badge">{pmBadgeCount}</span>
                )}
              </div>
            ))}
          </div>
        </aside>
        <div className="main-pane">
          {isMobile && !showChatList && (
            <div className="mobile-chat-header">
              <button className="mobile-chat-header-back" onClick={() => setShowChatList(true)} aria-label="Back to chat list" style={{ position: 'relative' }}>
                ☰
                {pmBadgeCount > 0 && activeChat !== 'ninja' && (
                  <span className="mobile-badge">{pmBadgeCount}</span>
                )}
              </button>
              {activeChat === 'group' ? (
                <>
                  <span className="mobile-chat-header-avatar group-header-avatar">🥷</span>
                  <span className="mobile-chat-header-avatar group-header-overflow">+20</span>
                </>
              ) : (
                <span className="mobile-chat-header-avatar">{sidebarChatsBase.find(c => c.key === activeChat)?.avatar}</span>
              )}
              <span className="mobile-chat-header-title">{activeChat === 'group' ? 'SYNERGY Group Chat' : sidebarChatsBase.find(c => c.key === activeChat)?.name}</span>
              <button
                type="button"
                className="about-btn-window about-btn-window--mobile"
                onClick={() => setShowAboutModal(true)}
              >
                About this app
              </button>
            </div>
          )}
          <section className="chat-area">
            <div className="chat-messages" ref={chatMessagesRef}>
              {chatContent}
            </div>
            {chatForm}
          </section>
          {/* Call popup should show regardless of activeChat */}
          {showCallPopup && !callAnswered && (
            <div className="call-popup-overlay">
              <div className="call-popup-card">
                <div className="call-popup-title">Ninja PM is calling you</div>
                <div className="call-popup-avatar-pulse">
                  <span className="call-popup-avatar">🥷</span>
      </div>
                <div className="call-popup-buttons">
                  <button className="call-btn video" onClick={handleCallAnswer} title="Video Call">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="7" width="13" height="10" rx="2" fill="#fff"/>
                      <path d="M21 7L16 10.5V13.5L21 17V7Z" fill="#fff"/>
                    </svg>
                  </button>
                  <button className="call-btn hangup" onClick={handleCallHangup} title="Hang Up">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="4" rx="2" fill="#fff"/></svg>
        </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <AboutModal open={showAboutModal} onClose={() => setShowAboutModal(false)} />
      {showVideoModal && (
        <div className="video-modal-overlay">
          <div className="video-modal-card">
            <div className="video-modal-title">SYNERGY Group Video Call</div>
            <div className="video-grid">
              {videoUsers.slice(0, 16).map((user, i) => (
                <div key={user.name + i} className={`video-user${user.talking ? ' talking' : ''}`}>
                  <span className={`video-avatar${user.talking ? ' pulse' : ''}`}>{user.avatar}</span>
                </div>
              ))}
            </div>
            <button className="video-leave-btn" onClick={handleVideoLeave}>Leave</button>
          </div>
        </div>
      )}
    </>
  )
}

export default App
