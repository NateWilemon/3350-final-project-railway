import { useState, useRef, useEffect } from 'react'

const API = 'http://localhost:3001'

export default function Chat({ match, navigate }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pfpUrl, setPfpUrl] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [conversationId, setConversationId] = useState(match?.conversationId || null)
  const bottomRef = useRef(null)

  const userId = parseInt(localStorage.getItem('userId'))
  const closedKey = `closedConversations:${userId}`

  const saveClosedMatch = (matchId) => {
    if (!matchId) return
    const closed = JSON.parse(localStorage.getItem(closedKey) || '[]')
    if (!closed.includes(matchId)) {
      localStorage.setItem(closedKey, JSON.stringify([...closed, matchId]))
    }
  }

  useEffect(() => {
    if (!match?.matchId) return
    fetch(`${API}/messages/${match.matchId}`)
      .then(res => res.json())
      .then(data => {
        if (data.conversation) setConversationId(data.conversation.conversation_id)
        if (data.messages) setMessages(data.messages)
      })
      .catch(err => console.error(err))
  }, [match])

  useEffect(() => {
    const otherUserId = match?.user_id || match?.id
    if (!otherUserId) return

    fetch(`${API}/getPFP`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userID: otherUserId }),
    })
      .then(res => res.ok ? res.blob() : null)
      .then(blob => {
        if (blob) setPfpUrl(URL.createObjectURL(blob))
      })
      .catch(() => setPfpUrl(null))
  }, [match])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getConversationId = async () => {
    if (conversationId) return conversationId
    if (!match?.matchId) return null

    const res = await fetch(`${API}/messages/${match.matchId}`)
    const data = await res.json()
    const resolvedId = data.conversation?.conversation_id || null

    if (resolvedId) setConversationId(resolvedId)
    return resolvedId
  }

  const sendMsg = async () => {
    if (!input.trim()) return

    const idToUse = await getConversationId()
    if (!idToUse) {
      alert('Could not find this conversation.')
      return
    }

    const text = input.trim()
    setInput('')

    try {
      const res = await fetch(`${API}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationID: idToUse, userID: userId, body: text }),
      })

      if (!res.ok) {
        alert('Could not send message.')
        setInput(text)
        return
      }

      setMessages(m => [...m, {
        message_id: Date.now(),
        user_id: userId,
        body: text,
        sent_at: new Date().toISOString(),
      }])
    } catch {
      alert('Could not connect to server. Make sure it is running.')
      setInput(text)
    }
  }

  const closeConversation = async () => {
    if (!window.confirm('Close this conversation?')) return

    try {
      const idToClose = await getConversationId()

      if (idToClose) {
        let closeRes = await fetch(`${API}/closeConversation`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            userID: userId,
            conversationID: idToClose,
          }),
        })

        if (closeRes.status === 404) {
          closeRes = await fetch(`${API}/closeconversation`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              userID: userId,
              conversationID: idToClose,
            }),
          })
        }

        if (!closeRes.ok && closeRes.status !== 404) {
          alert('Could not close conversation.')
          return
        }
      }

      saveClosedMatch(match?.matchId)
      navigate('messages')
    } catch {
      saveClosedMatch(match?.matchId)
      navigate('messages')
    }
  }

  const unmatch = async () => {
    if (!window.confirm('Unmatch this person?')) return
    await fetch(`${API}/unmatch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ matchID: match.matchId }),
    })
    navigate('matches')
  }

  const blockUser = async () => {
    if (!window.confirm('Block this user?')) return

    const targetUserID = match?.user_id || match?.id
    if (!targetUserID) {
      alert('Could not find this user to block.')
      return
    }

    await fetch(`${API}/blockUser`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userID: userId, targetUserID }),
    })

    navigate('matches')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--gray-100)', paddingBottom: 'var(--nav-height)' }}>
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
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {pfpUrl ? (
            <img
              src={pfpUrl}
              alt={match?.name || 'Match'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)' }}>{match?.name?.charAt(0)}</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{match?.name || 'Match'}</p>
          {match?.major && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{match.major}</p>}
        </div>
        <button onClick={() => setShowOptions(true)} style={{ color: 'rgba(255,255,255,0.8)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: 14 }}>
            Say hi to {match?.name}!
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.user_id === userId
          return (
            <div key={msg.message_id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{
                maxWidth: '75%',
                background: isMe ? 'var(--blue)' : 'var(--white)',
                color: isMe ? 'white' : 'var(--gray-800)',
                padding: '10px 14px',
                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                fontSize: 15, lineHeight: 1.4,
              }}>
                {msg.body}
                <p style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: 'right' }}>
                  {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '10px 14px', background: 'var(--white)',
        borderTop: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', gap: 10,
        position: 'fixed', bottom: 'var(--nav-height)', left: 0, right: 0, zIndex: 50,
      }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMsg()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '11px 16px', border: '1.5px solid var(--gray-200)', borderRadius: 99, fontSize: 15, outline: 'none', background: 'var(--gray-100)' }}
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

      {showOptions && (
        <div style={overlayStyle} onClick={() => setShowOptions(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', marginBottom: 16 }}>Options</h3>
            {[
              { label: 'Report User', action: () => { setShowOptions(false); setShowReport(true) }, color: 'var(--gray-800)' },
              { label: 'Close Conversation', action: () => { setShowOptions(false); closeConversation() }, color: 'var(--gray-800)' },
              { label: 'Unmatch', action: () => { setShowOptions(false); unmatch() }, color: 'var(--gray-800)' },
              { label: 'Block User', action: () => { setShowOptions(false); blockUser() }, color: 'var(--red)' },
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{
                display: 'block', width: '100%', padding: '14px 0',
                borderBottom: '1px solid var(--gray-200)', textAlign: 'left',
                fontSize: 15, fontWeight: 600, color: item.color,
              }}>
                {item.label}
              </button>
            ))}
            <button onClick={() => setShowOptions(false)}
              style={{ width: '100%', marginTop: 16, padding: 13, background: 'var(--gray-100)', borderRadius: 12, fontWeight: 600, color: 'var(--gray-600)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <ReportModal
          conversationId={conversationId}
          userId={userId}
          messages={messages}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}

function ReportModal({ conversationId, userId, messages, onClose }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const reasons = ['Inappropriate behavior', 'Harassment', 'Spam', 'Fake profile', 'Other']

  const submit = async () => {
    if (!reason) return

    const latestMessage = messages?.[messages.length - 1]

    setLoading(true)
    try {
      const res = await fetch(`${API}/reportUser`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userID: userId,
          conversationID: conversationId,
          reasons: reason,
          details: details,
          messageID: latestMessage?.message_id || 1,
        }),
      })

      if (!res.ok) {
        alert('Could not submit report.')
        return
      }

      setSubmitted(true)
    } catch {
      alert('Could not connect to server. Make sure it is running.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>Done</div>
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
          <button onClick={onClose} style={{ color: 'var(--gray-400)', fontSize: 20 }}>x</button>
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
        <button onClick={submit} disabled={!reason || loading}
          style={{
            width: '100%', padding: 13, borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: reason ? 'var(--red)' : 'var(--gray-200)',
            color: reason ? 'white' : 'var(--gray-400)',
          }}>
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </div>
  )
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }
const modalStyle = { background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }