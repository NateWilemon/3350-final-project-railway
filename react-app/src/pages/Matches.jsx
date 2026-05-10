import { useState, useEffect } from 'react'

const API = 'http://localhost:3001'

export default function Matches({ navigate }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const userId = parseInt(localStorage.getItem('userId'))

  const loadMatches = () => {
    fetch(`${API}/matches/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.matches) setMatches(data.matches)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadMatches() }, [])

  const unmatch = async (e, matchId) => {
    e.stopPropagation()
    await fetch(`${API}/unmatch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ matchID: matchId }),
    })
    setMatches(prev => prev.filter(m => m.match_id !== matchId))
  }

  const blockUser = async (e, targetUserId, matchId) => {
    e.stopPropagation()
    await fetch(`${API}/blockUser`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userID: userId, targetUserID: targetUserId }),
    })
    setMatches(prev => prev.filter(m => m.match_id !== matchId))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-100)' }}>
      <div style={{ background: 'var(--blue)', padding: '16px 20px' }}>
        <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800 }}>Rowdy</h1>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Your Matches</h2>
        <p style={{ color: 'var(--gray-600)', fontSize: 14, marginBottom: 20 }}>
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </p>

        {loading && <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '40px 0' }}>Loading matches...</p>}

        {!loading && matches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💙</div>
            <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>No matches yet. Keep swiping!</p>
          </div>
        )}

        {matches.length > 0 && (
          <>
            {/* New matches horizontal scroll */}
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>New</h3>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4, marginBottom: 28 }}>
              {matches.map(m => (
                <button key={m.match_id}
                  onClick={() => navigate('chat', { matchId: m.match_id, ...m.other_user })}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72, background: 'none' }}>
                  <div style={{ width: 68, height: 68, borderRadius: '50%', border: '3px solid var(--yellow)', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--yellow)' }}>{m.other_user?.name?.charAt(0)}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-800)' }}>{m.other_user?.name}</span>
                </button>
              ))}
            </div>

            {/* All matches list */}
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>All Matches</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {matches.map(m => (
                <div key={m.match_id} style={{
                  background: 'var(--white)', borderRadius: 14, padding: '14px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--yellow)' }}>{m.other_user?.name?.charAt(0)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-800)' }}>{m.other_user?.name}</span>
                      <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 2 }}>{m.other_user?.major}</p>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => navigate('chat', { matchId: m.match_id, ...m.other_user })}
                      style={{ flex: 1, padding: '8px', background: 'var(--blue)', color: 'white', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                      💬 Message
                    </button>
                    <button
                      onClick={(e) => unmatch(e, m.match_id)}
                      style={{ flex: 1, padding: '8px', background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                      💔 Unmatch
                    </button>
                    <button
                      onClick={(e) => blockUser(e, m.other_user?.user_id, m.match_id)}
                      style={{ flex: 1, padding: '8px', background: '#fee2e2', color: 'var(--red)', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                      🚫 Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
