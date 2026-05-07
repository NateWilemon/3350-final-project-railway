import { useState, useEffect } from 'react'

const API = 'http://localhost:3001'

export default function Messages({ navigate }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    fetch(`${API}/matches/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.matches) setMatches(data.matches)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-100)' }}>
      <div style={{ background: 'var(--blue)', padding: '16px 20px' }}>
        <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800 }}>Rowdy</h1>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Messages</h2>

        {loading && <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '40px 0' }}>Loading messages...</p>}

        {!loading && matches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>No messages yet. Match with someone to start chatting!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {matches.map(m => (
            <button key={m.match_id} onClick={() => navigate('chat', { matchId: m.match_id, ...m.other_user })}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--white)', borderRadius: 14, padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'left',
              }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.other_user?.profile_picture
                  ? <img src={m.other_user.profile_picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--yellow)' }}>{m.other_user?.name?.charAt(0)}</span>
                }
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-800)' }}>
                    {m.other_user?.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{new Date(m.matched_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--gray-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Tap to chat
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
