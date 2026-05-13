import { useState } from 'react'

const API = 'https://rowdydating.up.railway.app'

export default function Register({ onBack, onNext }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.endsWith('@csub.edu')) { setError('Must use a @csub.edu email.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API}/createAccount`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (res.status === 201) {
        // Auto-login to get userId
        const loginRes = await fetch(`${API}/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const loginData = await loginRes.json()
        if (loginRes.status === 200) {
          localStorage.setItem('userId', loginData.userId)
        }
        onNext()
      } else {
        setError(data.message || 'Registration failed.')
      }
    } catch (err) {
      setError('Could not connect to server. Make sure it is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--white)' }}>
      {/* Header */}
      <div style={{ background: 'var(--blue)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ color: 'var(--white)', padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span style={{ color: 'var(--white)', fontSize: 20, fontWeight: 800 }}>Rowdy</span>
      </div>

      <div style={{ flex: 1, padding: '32px 24px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--blue)' }}>Create Account</h2>
        <p style={{ color: 'var(--gray-600)', fontSize: 14, marginBottom: 28 }}>Join Rowdy using your CSUB email</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>CSUB Email</label>
            <input type="email" placeholder="you@csub.edu" value={email}
              onChange={e => { setEmail(e.target.value); setError('') }} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" placeholder="Min 8 characters" value={password}
              onChange={e => { setPassword(e.target.value); setError('') }} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input type="password" placeholder="Re-enter password" value={confirm}
              onChange={e => { setConfirm(e.target.value); setError('') }} style={inputStyle} />
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...primaryBtnStyle, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating account...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }
const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 10, fontSize: 15, outline: 'none' }
const primaryBtnStyle = { width: '100%', padding: '14px', background: 'var(--blue)', color: 'var(--white)', borderRadius: 12, fontSize: 16, fontWeight: 700, marginTop: 4 }
