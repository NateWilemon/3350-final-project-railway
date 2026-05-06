import { useState, useRef, useEffect } from 'react'

// TODO: Replace with real API call when backend is ready
const INIT_MESSAGES = [
  { id: 1, from: 'them', text: 'Hey! Saw you like coffee too 😄', time: '2:30 PM' },
]

export default function Chat({ match, navigate }) {
  const [messages, setMessages] = useState(INIT_MESSAGES)
  const [input, setInput] = useState('')
  const [showReport, setShowReport] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMsg = () => {
    if (!input.trim()) return
    setMessages(m => [...m, {
      id: Date.now(), from: 'me', text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
    setInput('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--gray-100)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--blue)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 2px 8px rgba(0,53,148,0.2)',
      }}>
        <button onClick={() => navigate('messages')} style={{ color: 'white' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#8899bb', flexShrink: 0 }}>
          {match?.photo && <img src={match.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{match?.name || 'Match'}</p>
          {match?.major && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{match.major}</p>}
        </div>
        <button onClick={() => setShowReport(true)} style={{ color: 'rgba(255,255,255,0.8)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start',
            marginBottom: 10,
          }}>
            <div style={{
              maxWidth: '75%',
              background: msg.from === 'me' ? 'var(--blue)' : 'var(--white)',
              color: msg.from === 'me' ? 'white' : 'var(--gray-800)',
              padding: '10px 14px',
              borderRadius: msg.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              fontSize: 15, lineHeight: 1.4,
            }}>
              {msg.text}
              <p style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: 'right' }}>{msg.time}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 14px', background: 'var(--white)',
        borderTop: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMsg()}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '11px 16px',
            border: '1.5px solid var(--gray-200)',
            borderRadius: 99, fontSize: 15, outline: 'none',
            background: 'var(--gray-100)',
          }}
        />
        <button onClick={sendMsg} disabled={!input.trim()}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: input.trim() ? 'var(--blue)' : 'var(--gray-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? 'white' : 'var(--gray-400)'} strokeWidth="2.5" strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
    </div>
  )
}

function ReportModal({ onClose }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const reasons = ['Inappropriate behavior', 'Harassment', 'Spam', 'Fake profile', 'Other']

  if (submitted) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>Report Submitted</h3>
            <p style={{ color: 'var(--gray-600)', fontSize: 14, marginBottom: 24 }}>Our team will review this report.</p>
            <button onClick={onClose} style={{ padding: '12px 32px', background: 'var(--blue)', color: 'white', borderRadius: 10, fontWeight: 700 }}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>Report User</h3>
          <button onClick={onClose} style={{ color: 'var(--gray-400)', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {reasons.map(r => (
            <button key={r} onClick={() => setReason(r)}
              style={{
                padding: '10px 14px', borderRadius: 10, textAlign: 'left', fontSize: 14, fontWeight: 500,
                border: `2px solid ${reason === r ? 'var(--blue)' : 'var(--gray-200)'}`,
                background: reason === r ? 'var(--blue-light)' : 'var(--white)',
                color: reason === r ? 'var(--blue)' : 'var(--gray-800)',
              }}>
              {r}
            </button>
          ))}
        </div>
        <textarea value={details} onChange={e => setDetails(e.target.value)}
          placeholder="Additional details (optional)" rows={3}
          style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 10, fontSize: 14, outline: 'none', resize: 'none', marginBottom: 16 }}
        />
        <button onClick={() => reason && setSubmitted(true)} disabled={!reason}
          style={{
            width: '100%', padding: 13, borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: reason ? 'var(--red)' : 'var(--gray-200)',
            color: reason ? 'white' : 'var(--gray-400)',
          }}>
          Submit Report
        </button>
      </div>
    </div>
  )
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }
const modalStyle = { background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }
