// TODO: Replace with real API call when backend is ready
const MOCK_CONVOS = [
  { id: 1, name: 'Alex', age: 22, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80', lastMsg: 'Hey! Saw you like coffee too 😄', time: '2m', unread: 1 },
]

export default function Messages({ navigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-100)' }}>
      <div style={{ background: 'var(--blue)', padding: '16px 20px' }}>
        <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800 }}>Rowdy</h1>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Messages</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MOCK_CONVOS.map(c => (
            <button key={c.id} onClick={() => navigate('chat', c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--white)', borderRadius: 14, padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'left', marginBottom: 8,
              }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', background: '#ccc', flexShrink: 0 }}>
                <img src={c.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: c.unread > 0 ? 700 : 600, color: 'var(--gray-800)' }}>
                    {c.name}, {c.age}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{c.time}</span>
                </div>
                <p style={{
                  fontSize: 13, color: c.unread > 0 ? 'var(--gray-800)' : 'var(--gray-400)',
                  fontWeight: c.unread > 0 ? 600 : 400,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {c.lastMsg}
                </p>
              </div>
              {c.unread > 0 && (
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--blue)', color: 'white',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {c.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
