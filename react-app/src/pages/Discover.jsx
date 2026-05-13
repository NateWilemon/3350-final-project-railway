import { useState, useEffect } from 'react'

const API = 'https://rowdydating.up.railway.app'

export default function Discover({ navigate }) {
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [swipeAnim, setSwipeAnim] = useState(null)
  const [showMatch, setShowMatch] = useState(false)
  const [newMatchId, setNewMatchId] = useState(null)
  const [pfpUrls, setPfpUrls] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    fetch(`${API}/getQueue`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userID: parseInt(userId) }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.queue) setQueue(data.queue)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const profile = queue[index]
  const profileId = profile?.id || profile?.user_id
  const mainPhoto = profile?.profile_picture || profile?.photos?.[0] || pfpUrls[profileId] || null

  useEffect(() => {
    if (!profileId || pfpUrls[profileId]) return

    fetch(`${API}/getPFP`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userID: profileId }),
    })
      .then(res => res.ok ? res.blob() : null)
      .then(blob => {
        if (!blob) return
        setPfpUrls(prev => ({
          ...prev,
          [profileId]: URL.createObjectURL(blob),
        }))
      })
      .catch(() => {})
  }, [profileId])

  const swipe = async (dir) => {
    const userId = localStorage.getItem('userId')
    setSwipeAnim(dir)

    try {
      const res = await fetch(`${API}/swipe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userID: parseInt(userId),
          targetUserID: profile.id,
          decision: dir === 'right' ? 'yes' : 'no',
        }),
      })
      const data = await res.json()

      setTimeout(() => {
        setSwipeAnim(null)
        if (data.matched) {
          setNewMatchId(data.matchID)
          setShowMatch(true)
        } else {
          setIndex(i => i + 1)
        }
      }, 350)
    } catch (err) {
      setTimeout(() => {
        setSwipeAnim(null)
        setIndex(i => i + 1)
      }, 350)
    }
  }

  if (loading) {
    return (
      <div>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
          <p style={{ color: 'var(--gray-400)' }}>Finding matches...</p>
        </div>
      </div>
    )
  }

  if (showMatch) {
    return (
      <MatchModal
        profile={profile}
        photoUrl={mainPhoto}
        onMessage={() => {
          setShowMatch(false)
          if (newMatchId) {
            navigate('chat', {
              matchId: newMatchId,
              ...profile,
              user_id: profileId,
            })
          } else {
            navigate('messages')
          }
        }}
        onKeepSwiping={() => { setShowMatch(false); setNewMatchId(null); setIndex(i => i + 1) }}
      />
    )
  }

  if (!profile) {
    return (
      <div>
        <Header />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16 }}>
          <div style={{ fontSize: 56 }}>🔥</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)' }}>You've seen everyone!</h3>
          <p style={{ color: 'var(--gray-600)', textAlign: 'center', fontSize: 14 }}>Check back later for new Rowdy students.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-100)' }}>
      <Header />

      <div style={{ flex: 1, padding: '16px 16px 0' }}>
        {/* Card */}
        <div style={{
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
          height: '62vh',
          maxHeight: 520,
          background: '#222',
          transform: swipeAnim === 'left'
            ? 'translateX(-120%) rotate(-15deg)'
            : swipeAnim === 'right'
            ? 'translateX(120%) rotate(15deg)'
            : 'translateX(0) rotate(0)',
          opacity: swipeAnim ? 0 : 1,
          transition: swipeAnim ? 'transform 0.35s ease, opacity 0.35s' : 'none',
        }}>
          {mainPhoto ? (
            <img src={mainPhoto} alt={profile.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 80, fontWeight: 800, color: 'var(--yellow)' }}>
                {profile.name?.charAt(0) || '?'}
              </span>
            </div>
          )}

          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
            padding: '24px 20px 20px',
          }}>
            <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
              {profile.name}, {profile.age}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: 500, marginBottom: 10 }}>
              {profile.major}
            </p>
            {profile.bio && (
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                {profile.bio}
              </p>
            )}
            {profile.hobbies && profile.hobbies.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {profile.hobbies.map(h => (
                  <span key={h} style={{
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    padding: '5px 12px', borderRadius: 99,
                  }}>
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, padding: '24px 0 8px' }}>
          <button onClick={() => swipe('left')} style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--white)', boxShadow: '0 3px 16px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button onClick={() => swipe('right')} style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'var(--yellow)', boxShadow: '0 4px 20px rgba(255,199,44,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="var(--blue)" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>Do not sell or share my personal info</p>
      </div>
    </div>
  )
}

function Header() {
  return (
    <div style={{
      background: 'var(--blue)', height: 'var(--header-height)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
    }}>
      <span style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Rowdy</span>
    </div>
  )
}

function MatchModal({ profile, photoUrl, onMessage, onKeepSwiping }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--blue)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h2 style={{ color: 'var(--yellow)', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>It's a Match!</h2>
      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 32 }}>
        You and {profile?.name} both liked each other
      </p>
      <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', marginBottom: 32, border: '4px solid var(--yellow)', background: 'var(--blue-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photoUrl
          ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--yellow)' }}>{profile?.name?.charAt(0)}</span>
        }
      </div>
      <button onClick={onMessage} style={{
        width: '100%', padding: 16, background: 'var(--yellow)', color: 'var(--blue)',
        borderRadius: 14, fontSize: 17, fontWeight: 800, marginBottom: 14,
      }}>Send a Message</button>
      <button onClick={onKeepSwiping} style={{
        width: '100%', padding: 16, background: 'rgba(255,255,255,0.15)',
        color: 'var(--white)', borderRadius: 14, fontSize: 17, fontWeight: 700,
        border: '2px solid rgba(255,255,255,0.3)',
      }}>Keep Swiping</button>
    </div>
  )
}
