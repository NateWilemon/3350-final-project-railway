import { useState, useEffect, useRef } from 'react'

const API = 'http://localhost:3001'

function calculateAge(birthdate) {
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const MAJORS = ['Computer Science', 'Business Administration', 'Biology', 'Psychology', 'Engineering', 'Nursing', 'Math', 'History', 'English', 'Criminal Justice', 'Education', 'Kinesiology', 'Other']

export default function Profile({ navigate }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState({})
  const [showSettings, setShowSettings] = useState(false)
  const [showEmailVerify, setShowEmailVerify] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState([])
  const [showBlocked, setShowBlocked] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef()

  const userId = localStorage.getItem('userId')

  const [pfpUrl, setPfpUrl] = useState(null)
  const [photos, setPhotos] = useState([])

  const handleLogout = () => {
    localStorage.removeItem('userId')
    localStorage.removeItem('currentPage')
    navigate('login')
  }

  const loadProfile = () => {
    fetch(`${API}/profile/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.profile) { setProfile(data.profile); setEdit(data.profile) }
        setLoading(false)
        fetchPFP()
        fetchPhotos()
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    if (!userId) return
    loadProfile()
  }, [])

  const fetchPFP = () => {
    fetch(`${API}/getPFP`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userID: parseInt(userId) }),
    })
      .then(res => { if (res.ok) return res.blob(); return null })
      .then(blob => { if (blob) setPfpUrl(URL.createObjectURL(blob)) })
      .catch(() => {})
  }

  const fetchPhotos = () => {
    fetch(`${API}/getPhotos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userID: parseInt(userId) }),
    })
      .then(res => res.json())
      .then(data => { if (data.photos) setPhotos(data.photos) })
      .catch(() => {})
  }

  const uploadPhoto = async (e, isPfp) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('userID', userId)
    formData.append('pfp', isPfp ? '1' : '0')

    setUploadMsg('Uploading...')
    try {
      const res = await fetch(`${API}/addpicture`, { method: 'POST', body: formData })
      const data = await res.json()
      setUploadMsg(data.message || 'Done!')
      // Reload profile to show new photo
      const profileRes = await fetch(`${API}/profile/${userId}`)
      const profileData = await profileRes.json()
      if (profileData.profile) setProfile(profileData.profile)
      fetchPFP()
      fetchPhotos()
      setTimeout(() => setUploadMsg(''), 2000)
    } catch {
      setUploadMsg('Upload failed')
    }
  }

  const loadBlockedUsers = () => {
    fetch(`${API}/blockedUsers/${userId}`)
      .then(res => res.json())
      .then(data => { if (data.blockedUsers) setBlockedUsers(data.blockedUsers) })
  }

  const unblock = async (targetId) => {
    await fetch(`${API}/unblockUser`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userID: parseInt(userId), targetUserID: targetId }),
    })
    loadBlockedUsers()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-100)' }}>
        <div style={{ background: 'var(--blue)', padding: '16px 20px' }}>
          <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800 }}>Rowdy</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <p style={{ color: 'var(--gray-400)' }}>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-100)' }}>
        <div style={{ background: 'var(--blue)', padding: '16px 20px' }}>
          <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800 }}>Rowdy</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 24, gap: 16 }}>
          <div style={{ fontSize: 48 }}>👤</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>No Profile Found</h3>
          <button onClick={() => navigate('create-profile')}
            style={{ padding: '14px 32px', background: 'var(--blue)', color: 'white', borderRadius: 12, fontWeight: 700, fontSize: 15 }}>
            Create Profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-100)' }}>
      <div style={{ background: 'var(--blue)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800 }}>Rowdy</h1>
        {!editing && <button onClick={() => setEditing(true)} style={{ color: 'var(--white)', fontSize: 14, fontWeight: 600 }}>Edit</button>}
      </div>

      {!editing ? (
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile card */}
          <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ background: 'var(--blue)', height: 90, position: 'relative' }}>
              <div style={{
                position: 'absolute', bottom: -36, left: 20,
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--yellow)', border: '4px solid white',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 800, color: 'var(--blue)',
              }}>
                {pfpUrl
                  ? <img src={pfpUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile.name?.charAt(0) || '?'
                }
              </div>
            </div>
            <div style={{ padding: '44px 20px 20px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-800)' }}>
                {profile.name}{profile.birthdate ? `, ${calculateAge(profile.birthdate)}` : ''}
              </h2>
              <p style={{ color: 'var(--gray-600)', fontSize: 14, marginBottom: 4 }}>{profile.major} • {profile.gender}</p>
              <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>Looking for: {profile.looking_for}</p>
            </div>
          </div>

          {/* Bio */}
          <div style={{ background: 'var(--white)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>About</h3>
            <p style={{ fontSize: 15, color: 'var(--gray-800)', lineHeight: 1.6 }}>{profile.bio || 'No bio yet.'}</p>
          </div>

          {/* Photo upload */}
          <div style={{ background: 'var(--white)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Photos</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { fileRef.current.dataset.pfp = '1'; fileRef.current.click() }}
                style={{ flex: 1, padding: '10px', background: 'var(--blue)', color: 'white', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                📸 Set Profile Photo
              </button>
              <button onClick={() => { fileRef.current.dataset.pfp = '0'; fileRef.current.click() }}
                style={{ flex: 1, padding: '10px', background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                🖼️ Add Photo
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => uploadPhoto(e, fileRef.current.dataset.pfp === '1')} />
            {uploadMsg && <p style={{ fontSize: 13, color: 'var(--blue)', marginTop: 8, textAlign: 'center' }}>{uploadMsg}</p>}
            {/* Photo gallery */}
            {photos.filter(p => !p.is_primary).length > 0 && (
              <PhotoGallery photos={photos.filter(p => !p.is_primary)} api={API} />
            )}
          </div>

          {/* Email verification */}
          {!profile.email_verified && (
            <div style={{ background: '#fef9c3', borderRadius: 14, padding: '14px 18px', border: '1px solid #fde047' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#854d0e', marginBottom: 6 }}>⚠️ Email not verified</p>
              <button onClick={() => setShowEmailVerify(true)}
                style={{ padding: '8px 16px', background: 'var(--yellow)', color: 'var(--blue)', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                Verify Email
              </button>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setEditing(true)}
              style={{ padding: 14, background: 'var(--blue)', color: 'white', borderRadius: 12, fontWeight: 700, fontSize: 15 }}>
              Edit Profile
            </button>
            <button onClick={() => { setShowBlocked(true); loadBlockedUsers() }}
              style={{ padding: 14, background: 'var(--white)', color: 'var(--gray-600)', borderRadius: 12, fontWeight: 600, fontSize: 15, border: '1.5px solid var(--gray-200)' }}>
              🚫 Blocked Users
            </button>
            <button onClick={() => setShowSettings(true)}
              style={{ padding: 14, background: 'var(--white)', color: 'var(--gray-600)', borderRadius: 12, fontWeight: 600, fontSize: 15, border: '1.5px solid var(--gray-200)' }}>
              Settings
            </button>
          </div>
        </div>
      ) : (
        <EditMode edit={edit} setEdit={setEdit}
          onSave={() => { setProfile(edit); setEditing(false) }}
          onCancel={() => setEditing(false)} />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={overlayStyle} onClick={() => setShowSettings(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', marginBottom: 20 }}>Settings</h3>
            <button onClick={handleLogout} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '14px 0', borderBottom: '1px solid var(--gray-200)',
              color: 'var(--red)', textAlign: 'left',
            }}>
              <p style={{ fontSize: 15, fontWeight: 600 }}>🚪 Log Out</p>
            </button>
            <button onClick={() => setShowSettings(false)}
              style={{ width: '100%', marginTop: 16, padding: 13, background: 'var(--gray-100)', borderRadius: 12, fontWeight: 600, color: 'var(--gray-600)' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Blocked Users Modal */}
      {showBlocked && (
        <div style={overlayStyle} onClick={() => setShowBlocked(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', marginBottom: 16 }}>Blocked Users</h3>
            {blockedUsers.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>No blocked users.</p>}
            {blockedUsers.map(u => (
              <div key={u.block_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--gray-200)' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{u.major}</p>
                </div>
                <button onClick={() => unblock(u.user_id)}
                  style={{ padding: '6px 12px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                  Unblock
                </button>
              </div>
            ))}
            <button onClick={() => setShowBlocked(false)}
              style={{ width: '100%', marginTop: 16, padding: 13, background: 'var(--gray-100)', borderRadius: 12, fontWeight: 600, color: 'var(--gray-600)' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Email Verify Modal */}
      {showEmailVerify && (
        <EmailVerifyModal userId={userId} email={profile.email} onClose={() => { setShowEmailVerify(false); loadProfile() }} />
      )}
    </div>
  )
}

function EditMode({ edit, setEdit, onSave, onCancel }) {
  const [error, setError] = useState('')

  const handleSave = () => {
    if (edit.bio && edit.bio.length > 100) { setError('Bio must not exceed 100 characters.'); return }
    onSave()
  }

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Name">
        <input value={edit.name || ''} onChange={e => setEdit(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
      </Field>
      <Field label="Major">
        <select value={edit.major || ''} onChange={e => setEdit(f => ({ ...f, major: e.target.value }))} style={{ ...inputStyle, background: 'white' }}>
          {MAJORS.map(m => <option key={m}>{m}</option>)}
        </select>
      </Field>
      <Field label={`Bio (${(edit.bio || '').length}/100)`}>
        <textarea value={edit.bio || ''} onChange={e => setEdit(f => ({ ...f, bio: e.target.value }))} rows={4} maxLength={100}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      </Field>
      {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, paddingBottom: 20 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: '2px solid var(--blue)', color: 'var(--blue)', fontWeight: 700 }}>Cancel</button>
        <button onClick={handleSave} style={{ flex: 2, padding: 14, background: 'var(--blue)', color: 'white', borderRadius: 12, fontWeight: 700, fontSize: 15 }}>Save Changes</button>
      </div>
    </div>
  )
}

function EmailVerifyModal({ userId, email, onClose }) {
  const [step, setStep] = useState('send')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const sendCode = async () => {
    setLoading(true)
    const res = await fetch(`${API}/sendEmail`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, userID: parseInt(userId) }),
    })
    const data = await res.json()
    setMsg(data.message)
    if (res.status === 200) setStep('verify')
    setLoading(false)
  }

  const verifyCode = async () => {
    setLoading(true)
    const res = await fetch(`${API}/verifyEmail`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userID: parseInt(userId), code }),
    })
    const data = await res.json()
    setMsg(data.message)
    if (res.status === 200) setTimeout(onClose, 1500)
    setLoading(false)
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', marginBottom: 12 }}>Verify Email</h3>
        {step === 'send' ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16 }}>
              We'll send a 6-digit code to <strong>{email}</strong>
            </p>
            <button onClick={sendCode} disabled={loading}
              style={{ width: '100%', padding: 13, background: 'var(--blue)', color: 'white', borderRadius: 12, fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 12 }}>Enter the 6-digit code sent to your email</p>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" maxLength={6}
              style={{ ...inputStyle, marginBottom: 12, textAlign: 'center', fontSize: 22, letterSpacing: 8 }} />
            <button onClick={verifyCode} disabled={loading || code.length !== 6}
              style={{ width: '100%', padding: 13, background: 'var(--blue)', color: 'white', borderRadius: 12, fontWeight: 700, opacity: (loading || code.length !== 6) ? 0.7 : 1 }}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </>
        )}
        {msg && <p style={{ fontSize: 13, color: 'var(--blue)', marginTop: 10, textAlign: 'center' }}>{msg}</p>}
        <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: 10, background: 'var(--gray-100)', borderRadius: 12, fontWeight: 600, color: 'var(--gray-600)', fontSize: 14 }}>Cancel</button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function PhotoGallery({ photos, api }) {
  const [selected, setSelected] = useState(null)
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {photos.map(photo => (
          <img key={photo.photo_id} src={`${api}/photo/${photo.photo_id}`}
            alt="" onClick={() => setSelected(photo)}
            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, cursor: 'pointer' }} />
        ))}
      </div>
      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
        }}>
          <img src={`${api}/photo/${selected.photo_id}`} alt=""
            style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
          <button onClick={() => setSelected(null)} style={{
            position: 'absolute', top: 20, right: 20,
            color: 'white', fontSize: 28, fontWeight: 700, background: 'none',
          }}>✕</button>
        </div>
      )}
    </>
  )
}

const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 10, fontSize: 15, outline: 'none' }
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }
const modalStyle = { background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }
