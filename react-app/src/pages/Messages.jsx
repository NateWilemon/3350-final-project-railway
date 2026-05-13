import { useState, useEffect } from 'react'

const API = 'https://rowdydating.up.railway.app'

export default function Messages({ navigate }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const userId = parseInt(localStorage.getItem('userId'))

  const loadConversations = () => {
    fetch(`${API}/activeConversations/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.conversations) setConversations(data.conversations)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadConversations() }, [])

  const closeConversation = async (e, conversationId) => {
    e.stopPropagation()
    if (!window.confirm('Close this conversation?')) return
    await fetch(`${API}/closeConversation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversationID: conversationId }),
    })
    loadConversations()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-100)' }}>
      <div style={{ background: 'var(--blue)', padding: '16px 20px' }}>
        <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800 }}>Rowdy</h1>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Messages</h2>

        {loading && <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '40px 0' }}>Loading...</p>}

        {!loading && conversations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>No active conversations. Match with someone to start chatting!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conversations.map(c => (
            <button key={c.conversation_id}
              onClick={() => navigate('chat', { matchId: c.match_id, conversationId: c.conversation_id, ...c.other_user })}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--white)', borderRadius: 14, padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'left',
              }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--yellow)' }}>{c.other_user?.name?.charAt(0)}</span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-800)' }}>{c.other_user?.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--gray-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.other_user?.major}
                </p>
              </div>
              <button onClick={(e) => closeConversation(e, c.conversation_id)}
                style={{ color: 'var(--gray-400)', padding: '4px 8px', fontSize: 12, borderRadius: 8, background: 'var(--gray-100)', flexShrink: 0 }}>
                Close
              </button>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
