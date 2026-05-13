import { useState, useEffect } from 'react'

const API = 'http://localhost:3001'

export default function Messages({ navigate }) {
  const [conversations, setConversations] = useState([])
  const [pfpUrls, setPfpUrls] = useState({})
  const [loading, setLoading] = useState(true)

  const userId = parseInt(localStorage.getItem('userId'))
  const closedKey = `closedConversations:${userId}`

  const getClosedMatches = () => JSON.parse(localStorage.getItem(closedKey) || '[]')

  const saveClosedMatch = (matchId) => {
    if (!matchId) return
    const closed = getClosedMatches()
    if (!closed.includes(matchId)) {
      localStorage.setItem(closedKey, JSON.stringify([...closed, matchId]))
    }
  }

  const loadConversations = async () => {
    setLoading(true)

    try {
      const closedMatches = getClosedMatches()

      const convoRes = await fetch(`${API}/activeConversations/${userId}`)
      const convoData = await convoRes.json()
      const activeConversations = convoData.conversations || []

      const matchRes = await fetch(`${API}/matches/${userId}`)
      const matchData = await matchRes.json()
      const matches = matchData.matches || []

      const matchThreads = matches
        .filter(match => !closedMatches.includes(match.match_id))
        .map(match => {
          const existingConversation = activeConversations.find(
            convo => convo.match_id === match.match_id
          )

          return existingConversation || {
            conversation_id: null,
            match_id: match.match_id,
            last_message_at: match.matched_at,
            other_user: match.other_user,
          }
        })

      setConversations(matchThreads)
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    conversations.forEach(conversation => {
      const otherUserId = conversation.other_user?.user_id
      if (!otherUserId || pfpUrls[otherUserId]) return

      fetch(`${API}/getPFP`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userID: otherUserId }),
      })
        .then(res => res.ok ? res.blob() : null)
        .then(blob => {
          if (!blob) return
          setPfpUrls(prev => ({
            ...prev,
            [otherUserId]: URL.createObjectURL(blob),
          }))
        })
        .catch(() => {})
    })
  }, [conversations])

  const closeConversation = async (e, conversationId, matchId) => {
    e.stopPropagation()
    if (!window.confirm('Close this conversation?')) return

    let idToClose = conversationId

    try {
      if (!idToClose && matchId) {
        const messageRes = await fetch(`${API}/messages/${matchId}`)
        const messageData = await messageRes.json()
        idToClose = messageData.conversation?.conversation_id
      }

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

      saveClosedMatch(matchId)
      loadConversations()
    } catch {
      saveClosedMatch(matchId)
      loadConversations()
    }
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
            <div style={{ fontSize: 48, marginBottom: 12 }}>Messages</div>
            <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>No active conversations. Match with someone to start chatting!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conversations.map(c => (
            <div
              key={c.conversation_id || `match-${c.match_id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--white)', borderRadius: 14, padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'left',
              }}
            >
              <button
                onClick={() => navigate('chat', { matchId: c.match_id, conversationId: c.conversation_id, ...c.other_user })}
                style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, textAlign: 'left' }}
              >
                <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {pfpUrls[c.other_user?.user_id] ? (
                    <img
                      src={pfpUrls[c.other_user.user_id]}
                      alt={c.other_user?.name || 'Conversation'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--yellow)' }}>{c.other_user?.name?.charAt(0)}</span>
                  )}
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
              </button>
              <button
                onClick={(e) => closeConversation(e, c.conversation_id, c.match_id)}
                style={{ color: 'var(--gray-400)', padding: '4px 8px', fontSize: 12, borderRadius: 8, background: 'var(--gray-100)', flexShrink: 0 }}
              >
                Close
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
