import { useState, useRef, useEffect } from 'react'
import { responses } from './data/responses'
import './App.css'
import teamsCallSound from './assets/audio/teams_call.mp3'
import endCallSound from './assets/audio/end_call.mp3'
import speakingSound from './assets/audio/speaking.mp3'

type ResponseType = 'yes' | 'no' | 'maybe' | 'ghosted'

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

const memeImages = [
  'meme1.png', 'meme2.png', 'meme3.png', 'meme4.png', 'meme5.png',
  'meme6.png', 'meme7.png', 'meme8.png', 'meme9.png', 'meme10.png'
]

const scapegoatExcuses = [
  "It wasn't me, it was the previous team.",
  "I think that was out of my scope.",
  "I was waiting on input from Legal.",
  "I thought you were handling that.",
  "That was a system issue, not my fault.",
  "I never got the email.",
  "I was out of office that week.",
  "I delegated that to someone else.",
  "I flagged that as a risk in the last meeting.",
  "I was told to prioritize something else.",
  "I assumed it was already done.",
  "I think IT is still looking into it.",
  "I was just following orders.",
  "I thought that was Bob's responsibility.",
  "I didn't have the right permissions."
]

const sidebarChatsBase = [
  { key: 'synergy', name: 'Synergy Bot', avatar: <Magic8BallIcon size={32} /> },
  { key: 'meme', name: 'Meme Guy', avatar: '😎' },
  { key: 'ninja', name: 'Ninja PM', avatar: '🦝' },
  { key: 'growth', name: 'Growth Guru', avatar: '🦖' },
  { key: 'scapegoat', name: 'Scapegoat', avatar: '🐐' },
]

const groupMembers = [
  { name: 'Synergy Bot', avatar: <Magic8BallIcon size={28} /> },
  { name: 'Blue Sky', avatar: '🐧' },
  { name: 'Ninja PM', avatar: '🦝' },
  { name: 'Growth Guru', avatar: '🦖' },
  { name: 'Goose', avatar: '🦢' },
  { name: 'You', avatar: <Magic8BallIcon size={28} /> },
]

const growthGuruLines = [
  "Time to pivot and embrace new opportunities!",
  "Let's leverage our core strengths and drive growth.",
  "Kudos to the team for pushing the envelope!",
  "Every challenge is a chance to innovate.",
  "Let's circle back and optimize our strategy.",
  "Great work! Let's keep the momentum going.",
  "Remember: disruption is just innovation in disguise.",
  "Let's blue-sky this and see where it takes us.",
  "Your efforts are moving the needle!",
  "Let's double down on our wins and iterate fast.",
  "Synergy is the key to exponential growth!",
  "Let's take this offline and strategize.",
  "Keep up the great work—success is a team sport!",
  "Let's align on our KPIs and drive results.",
  "Innovation starts with a single idea—keep them coming!"
]

const pmFollowUps = [
  "Can you provide a quick status update?",
  "What are the blockers on this?",
  "Do we have an ETA for completion?",
  "Is this on track for delivery?",
  "Have you looped in all stakeholders?",
  "Can we get this prioritized?",
  "What are the next steps?",
  "Do you need any support from the team?",
  "Is there a risk of scope creep?",
  "Can you add this to the project tracker?",
  "Let's sync up on this in the next standup.",
  "Can you share the latest metrics?",
  "Is this aligned with our quarterly goals?",
  "Do we have a backup plan?",
  "Can you summarize the action items?"
]

function getRandomJargon() {
  const all = [
    ...responses.responses.yes,
    ...responses.responses.no,
    ...responses.responses.maybe,
    ...responses.responses.ghosted,
  ]
  return all[Math.floor(Math.random() * all.length)]
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

function TeamsWindowBar() {
  return (
    <div className="teams-window-bar">
      <span className="window-dot red" />
      <span className="window-dot yellow" />
      <span className="window-dot green" />
      {/* Removed Teams logo, app title is now left-aligned after window dots */}
      <span className="app-title-windowbar">Magic 8-Ball Team Chat</span>
      <button className="emoji-selector-btn" title="Choose an emoji">
        <span role="img" aria-label="emoji">😀</span>
      </button>
    </div>
  )
}

function App() {
  const [activeChat, setActiveChat] = useState<ChatKey>('synergy')
  const [synergyHistory, setSynergyHistory] = useState<{q: string, a: string | null}[]>([])
  const [ninjaHistory, setNinjaHistory] = useState<{q: string | null, a: string | null}[]>([])
  const [groupHistory, setGroupHistory] = useState<{q: string, a: string | null}[]>([])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showNinjaBadge, setShowNinjaBadge] = useState(false)
  const [ninjaPrompted, setNinjaPrompted] = useState(false)
  const [groupChatOpen, setGroupChatOpen] = useState(false)
  const [showCallPopup, setShowCallPopup] = useState(false)
  const [callAnswered, setCallAnswered] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
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
  const emojiOptions = ['😀','😁','😂','😍','😎','😢','😡','👍','🙌','🎉']
  const isMobile = window.innerWidth < 700
  const [showChatList, setShowChatList] = useState(isMobile)

  // Count total user messages across all chats
  const totalUserMessages = synergyHistory.length + memeHistory.length + scapegoatHistory.length + ninjaHistory.length + groupHistory.length + growthHistory.length
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
      setNinjaPrompted(true)
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

  // Synergy Bot chat logic
  const handleSynergySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setIsLoading(true)
    // Add user message
    setSynergyHistory([...synergyHistory, { q: question, a: null }])
    setQuestion('')
    // Add typing indicator as a bot message
    setTimeout(() => {
      setSynergyHistory(history => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      // After typing, replace with real response
      setTimeout(() => {
        setSynergyHistory(history => {
          const updated = [...history]
          const types: ResponseType[] = ['yes', 'no', 'maybe', 'ghosted']
          const randomType = types[Math.floor(Math.random() * types.length)]
          const resp = responses.responses[randomType][Math.floor(Math.random() * responses.responses[randomType].length)]
          updated[updated.length - 1].a = resp
          return updated
        })
        setIsLoading(false)
      }, 1000)
    }, 100)
  }

  // Ninja PM chat logic
  const handleNinjaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    // Add user message
    setNinjaHistory([...ninjaHistory, { q: question, a: null }])
    setQuestion('')
    // Add typing indicator as a bot message
    setTimeout(() => {
      setNinjaHistory(history => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      // After typing, show call popup only
      setTimeout(() => {
        setNinjaHistory(history => {
          const updated = [...history]
          updated[updated.length - 1].a = 'Please join the call.'
          return updated
        })
        setShowCallPopup(true)
        setCallAnswered(false)
      }, 1000)
    }, 100)
  }

  // Group chat logic
  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setIsLoading(true)
    setGroupHistory([...groupHistory, { q: question, a: null }])
    setQuestion('')
    setTimeout(() => {
      setGroupHistory(history => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      setTimeout(() => {
        setGroupHistory(history => {
          const updated = [...history]
          updated[updated.length - 1].a = getRandomJargon()
          return updated
        })
        setIsLoading(false)
      }, 1000)
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
  const videoUsers = [
    { name: 'Ninja PM', avatar: '🦝', talking: true },
    { name: 'Synergy Bot', avatar: <Magic8BallIcon size={32} />, talking: false },
    { name: 'Blue Sky', avatar: '🐧', talking: false },
    { name: 'Growth Guru', avatar: '🦖', talking: false },
    { name: 'Goose', avatar: '🦢', talking: false },
    { name: 'You', avatar: <Magic8BallIcon size={32} />, talking: false },
    // Fill up to 16 users
    ...Array.from({ length: 10 }, (_, i) => ({ name: `User ${i+1}`, avatar: '👤', talking: false }))
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

  // Meme Guy chat logic
  const handleMemeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setIsLoading(true)
    setMemeHistory([...memeHistory, { q: question, a: null }])
    setQuestion('')
    setTimeout(() => {
      setMemeHistory(history => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      setTimeout(() => {
        setMemeHistory(history => {
          let availableMemes = memeImages.filter(m => !usedMemes.includes(m))
          if (availableMemes.length === 0) {
            setUsedMemes([])
            availableMemes = [...memeImages]
          }
          const randomMeme = availableMemes[Math.floor(Math.random() * availableMemes.length)]
          setUsedMemes(prev => [...prev, randomMeme])
          const updated = [...history]
          updated[updated.length - 1].a = randomMeme
          return updated
        })
        setIsLoading(false)
      }, 1000)
    }, 100)
  }

  // Scapegoat chat logic
  const handleScapegoatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setIsLoading(true)
    setScapegoatHistory([...scapegoatHistory, { q: question, a: null }])
    setQuestion('')
    setTimeout(() => {
      setScapegoatHistory(history => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      setTimeout(() => {
        setScapegoatHistory(history => {
          const updated = [...history]
          const excuse = scapegoatExcuses[Math.floor(Math.random() * scapegoatExcuses.length)]
          updated[updated.length - 1].a = excuse
          return updated
        })
        setIsLoading(false)
      }, 1000)
    }, 100)
  }

  // Growth Guru chat logic
  const handleGrowthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setIsLoading(true)
    setGrowthHistory([...growthHistory, { q: question, a: null }])
    setQuestion('')
    setTimeout(() => {
      setGrowthHistory(history => {
        const updated = [...history]
        updated[updated.length - 1].a = 'typing'
        return updated
      })
      setTimeout(() => {
        setGrowthHistory(history => {
          const updated = [...history]
          const line = growthGuruLines[Math.floor(Math.random() * growthGuruLines.length)]
          updated[updated.length - 1].a = line
          return updated
        })
        setIsLoading(false)
      }, 1000)
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
              <span className="avatar user">👤</span>
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
                  <div className="message-content">{item.a}</div>
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
          <span role="img" aria-label="emoji">😀</span>
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
          placeholder="Type a new message"
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
          <span className="avatar bot">🦝</span>
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
                <span className="avatar user">👤</span>
              </div>
            )}
            {item.a === 'typing' && (
              <div key={`typing-ninja-${i}`} className="message bot-message">
                <span className="avatar bot">🦝</span>
                <div className="bubble bot">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {item.a && item.a !== 'typing' && (
              <div key={`bot-ninja-${i}`} className="message bot-message">
                <span className="avatar bot">🦝</span>
                <div className="bubble bot">
                  <div className="message-content">{item.a}</div>
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
          <span role="img" aria-label="emoji">😀</span>
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
          placeholder="Reply with a status update..."
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
        <div className="group-header-bar">
          <span className="avatar group-header-avatar">🦝</span>
          <span className="avatar group-header-overflow">+20</span>
          <span className="group-header-title">SYNERGY Group Chat</span>
        </div>
        <div className="message bot-message">
          <span className="avatar bot">🦝</span>
          <div className="bubble bot">
      
            <div className="message-content">Looping in the team</div>
          </div>
        </div>
        {groupHistory.map((item, i) => (
          <>
            <div key={`user-${i}`} className="message user-message">
              <div className="bubble user">
                <div className="sender-name">You</div>
                <div className="message-content">{item.q}</div>
              </div>
              <span className="avatar user">👤</span>
            </div>
            {item.a === 'typing' && (
              <div key={`typing-group-${i}`} className="message bot-message">
                <span className="avatar bot">🦝</span>
                <div className="bubble bot">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {item.a && item.a !== 'typing' && (
              <div key={`bot-group-${i}`} className="message bot-message">
                <span className="avatar bot">🦝</span>
                <div className="bubble bot">
                  <div className="sender-name">Ninja PM</div>
                  <div className="message-content">{item.a}</div>
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
          <span role="img" aria-label="emoji">😀</span>
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
          placeholder="Looping in all for visibility..."
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
            <div className="message-content">Drop your best question, and I'll drop a meme.</div>
          </div>
        </div>
        {memeHistory.map((item, i) => (
          <>
            <div key={`user-meme-${i}`} className="message user-message">
              <div className="bubble user">
                <div className="message-content">{item.q}</div>
              </div>
              <span className="avatar user">👤</span>
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
                  <img src={'/memes/' + item.a} alt="meme" className="meme-img" onLoad={() => setTimeout(scrollToBottom, 10)} />
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
          <span role="img" aria-label="emoji">😀</span>
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
          placeholder="Ask for a meme..."
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
              <span className="avatar user">👤</span>
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
                  <div className="message-content">{item.a}</div>
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
          <span role="img" aria-label="emoji">😀</span>
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
          placeholder="Ask for an excuse..."
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
              <span className="avatar user">👤</span>
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
                  <div className="message-content">{item.a}</div>
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
          <span role="img" aria-label="emoji">😀</span>
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
          placeholder="Ask for motivation or a pivot..."
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

  // After every 4th user message globally, PM follows up in Ninja PM chat and badge count increases
  useEffect(() => {
    if (totalUserMessages > 0 && totalUserMessages % 4 === 0 && lastPMFollowUp !== totalUserMessages) {
      setNinjaHistory(history => ([
        ...history,
        { q: null, a: pmFollowUps[Math.floor(Math.random() * pmFollowUps.length)] }
      ]))
      setLastPMFollowUp(totalUserMessages)
      setPmBadgeCount(count => count + 1)
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
          {sidebarChatsBase.map(chat => (
            <button
              key={chat.key}
              className="mobile-chat-list-item"
              onClick={() => { setActiveChat(chat.key as ChatKey); setShowChatList(false); }}
              style={{ position: 'relative' }}
            >
              <span className="mobile-chat-list-avatar">{chat.avatar}</span>
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
      <TeamsWindowBar />
      <audio ref={audioRef} src={teamsCallSound} preload="auto" />
      <audio ref={endAudioRef} src={endCallSound} preload="auto" />
      <audio ref={speakingAudioRef} src={speakingSound} preload="auto" />
      <div className="teams-root">
        <aside className="sidebar">
          <div className="sidebar-chats">
            {sidebarChats.map((chat, i) => (
              <div
                key={chat.key}
                className={`sidebar-chat${activeChat === chat.key ? ' active' : ''}`}
                onClick={() => handleSidebarClick(chat.key)}
                style={{ position: 'relative' }}
              >
                <span className="avatar">{chat.avatar}</span>
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
              <span className="mobile-chat-header-avatar">{sidebarChatsBase.find(c => c.key === activeChat)?.avatar}</span>
              <span className="mobile-chat-header-title">{sidebarChatsBase.find(c => c.key === activeChat)?.name}</span>
            </div>
          )}
          <header className="topbar">
            {/* Topbar is now minimal, app title moved to window bar */}
          </header>
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
                  <span className="call-popup-avatar">🦝</span>
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
