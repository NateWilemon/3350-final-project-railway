import { useEffect, useRef, useState } from 'react'

const API = 'https://rowdydating.up.railway.app'

const MAJORS = [
  'Computer Science', 'Business Administration', 'Biology', 'Psychology',
  'Engineering', 'Nursing', 'Math', 'History', 'English', 'Criminal Justice',
  'Education', 'Kinesiology', 'Other',
]

function calculateAge(birthdate) {
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function Profile({ navigate }) {
  const userId = localStorage.getItem('userId')
  const fileRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [edit, setEdit] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBlocked, setShowBlocked] = useState(false)
  const [showEmailVerify, setShowEmailVerify] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState([])
  const [pfpUrl, setPfpUrl] = useState(null)
  const [photos, setPhotos] = useState([])
  const [uploadMsg, setUploadMsg] = useState('')

  const loadProfile = async () => {
    if (!userId) return

    try {
      const res = await fetch(`${API}/profile/${userId}`)
      const data = await res.json()
      if (data.profile) {
        setProfile(data.profile)
        setEdit(data.profile)
      }
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchPFP = async () => {
    if (!userId) return

    try {
      const res = await fetch(`${API}/getPFP`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userID: parseInt(userId) }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      setPfpUrl(URL.createObjectURL(blob))
    } catch {
      setPfpUrl(null)
    }
  }

  const fetchPhotos = async () => {
    if (!userId) return

    try {
      const res = await fetch(`${API}/getPhotos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userID: parseInt(userId) }),
      })
      const data = await res.json()
      setPhotos(Array.isArray(data.photos) ? data.photos : [])
    } catch {
      setPhotos([])
    }
  }

  useEffect(() => {
    loadProfile()
    fetchPFP()
    fetchPhotos()
  }, [])

  const startEditing = () => {
    setEdit(profile || {})
    setEditing(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('userId')
    localStorage.removeItem('currentPage')
    navigate('login')
  }

  const uploadPhoto = async (e, isPfp) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const formData = new FormData()
    formData.append('photo', file)
    formData.append('userID', userId)
    formData.append('pfp', isPfp ? '1' : '0')

    setUploadMsg('Uploading...')

    try {
      const res = await fetch(`${API}/addpicture`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setUploadMsg(data.message || 'Upload failed')
        return
      }

      setUploadMsg(data.message || 'Photo uploaded')
      await loadProfile()
      await fetchPFP()
      await fetchPhotos()
      setTimeout(() => setUploadMsg(''), 2000)
    } catch {
      setUploadMsg('Upload failed')
    }
  }

  const loadBlockedUsers = async () => {
    try {
      const res = await fetch(`${API}/blockedUsers/${userId}`)
      const data = await res.json()
      setBlockedUsers(Array.isArray(data.blockedUsers) ? data.blockedUsers : [])
    } catch {
      setBlockedUsers([])
    }
  }

  const openBlockedUsers = () => {
    setShowBlocked(true)
    loadBlockedUsers()
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
      <Page>
        <Header />
        <CenterText>Loading profile...</CenterText>
      </Page>
    )
  }

  if (!profile) {
    return (
      <Page>
        <Header />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 24, gap: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>No Profile Found</h3>
          <button type="button" onClick={() => navigate('create-profile')} style={primaryButton}>
            Create Profile
          </button>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <Header action={!editing ? <button type="button" onClick={startEditing} style={headerAction}>Edit</button> : null} />

      {!editing ? (
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ProfileCard profile={profile} pfpUrl={pfpUrl} />

          <section style={panelStyle}>
            <h3 style={sectionTitle}>About</h3>
            <p style={{ fontSize: 15, color: 'var(--gray-800)', lineHeight: 1.6 }}>{profile.bio || 'No bio yet.'}</p>
          </section>

          <section style={panelStyle}>
            <h3 style={sectionTitle}>Photos</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  if (!fileRef.current) return
                  fileRef.current.dataset.pfp = '1'
                  fileRef.current.click()
                }}
                style={primaryButton}
              >
                Set Profile Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!fileRef.current) return
                  fileRef.current.dataset.pfp = '0'
                  fileRef.current.click()
                }}
                style={secondaryButton}
              >
                Add Photo
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => uploadPhoto(e, fileRef.current?.dataset.pfp === '1')}
            />
            {uploadMsg && <p style={{ fontSize: 13, color: 'var(--blue)', marginTop: 8, textAlign: 'center' }}>{uploadMsg}</p>}
            <PhotoGallery photos={photos.filter(p => !p.is_primary)} onDeleted={() => { fetchPhotos(); fetchPFP() }} />
          </section>

          {!profile.email_verified && (
            <section style={{ background: '#fef9c3', borderRadius: 14, padding: '14px 18px', border: '1px solid #fde047' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#854d0e', marginBottom: 6 }}>Email not verified</p>
              <button type="button" onClick={() => setShowEmailVerify(true)} style={{ ...primaryButton, background: 'var(--yellow)', color: 'var(--blue)', width: 'auto', padding: '8px 16px' }}>
                Verify Email
              </button>
            </section>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" onClick={startEditing} style={primaryButton}>Edit Profile</button>
            <button type="button" onClick={openBlockedUsers} style={outlineButton}>Blocked Users</button>
            <button type="button" onClick={() => setShowSettings(true)} style={outlineButton}>Settings</button>
          </div>
        </div>
      ) : (
        <EditMode
          userId={userId}
          edit={edit}
          setEdit={setEdit}
          onSave={(updatedProfile) => {
            setProfile(updatedProfile)
            setEdit(updatedProfile)
            setEditing(false)
          }}
          onCancel={() => {
            setEdit(profile)
            setEditing(false)
          }}
        />
      )}

      {showSettings && (
        <Modal title="Settings" onClose={() => setShowSettings(false)}>
          <button type="button" onClick={handleLogout} style={{ ...modalButton, color: 'var(--red)' }}>Log Out</button>
        </Modal>
      )}

      {showBlocked && (
        <Modal title="Blocked Users" onClose={() => setShowBlocked(false)}>
          {blockedUsers.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>No blocked users.</p>}
          {blockedUsers.map(user => (
            <div key={user.block_id || user.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--gray-200)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</p>
                <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{user.major}</p>
              </div>
              <button type="button" onClick={() => unblock(user.user_id)} style={{ padding: '6px 12px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                Unblock
              </button>
            </div>
          ))}
        </Modal>
      )}

      {showEmailVerify && (
        <EmailVerifyModal userId={userId} email={profile.email} onClose={() => { setShowEmailVerify(false); loadProfile() }} />
      )}
    </Page>
  )
}

function Page({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-100)' }}>{children}</div>
}

function Header({ action }) {
  return (
    <div style={{ background: 'var(--blue)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800 }}>Rowdy</h1>
      {action}
    </div>
  )
}

function CenterText({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <p style={{ color: 'var(--gray-400)' }}>{children}</p>
    </div>
  )
}

function ProfileCard({ profile, pfpUrl }) {
  return (
    <section style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ background: 'var(--blue)', height: 90, position: 'relative' }}>
        <div style={{
          position: 'absolute', bottom: -36, left: 20,
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--yellow)', border: '4px solid white',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: 'var(--blue)',
        }}>
          {pfpUrl ? <img src={pfpUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.name?.charAt(0) || '?'}
        </div>
      </div>
      <div style={{ padding: '44px 20px 20px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-800)' }}>
          {profile.name}{profile.birthdate ? `, ${calculateAge(profile.birthdate)}` : ''}
        </h2>
        <p style={{ color: 'var(--gray-600)', fontSize: 14, marginBottom: 4 }}>{profile.major} - {profile.gender}</p>
        <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>Looking for: {profile.looking_for}</p>
      </div>
    </section>
  )
}

function EditMode({ userId, edit, setEdit, onSave, onCancel }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if ((edit.bio || '').length > 100) {
      setError('Bio must not exceed 100 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API}/updateProfile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userID: parseInt(userId),
          name: edit.name,
          birthdate: edit.birthdate,
          gender: edit.gender,
          looking_for: edit.looking_for,
          major: edit.major,
          bio: edit.bio,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Failed to update profile.')
        return
      }

      onSave(edit)
    } catch {
      setError('Could not connect to server. Make sure it is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Name">
        <input value={edit.name || ''} onChange={e => setEdit(prev => ({ ...prev, name: e.target.value }))} style={inputStyle} />
      </Field>
      <Field label="Major">
        <select value={edit.major || ''} onChange={e => setEdit(prev => ({ ...prev, major: e.target.value }))} style={{ ...inputStyle, background: 'white' }}>
          <option value="">Select your major</option>
          {MAJORS.map(major => <option key={major} value={major}>{major}</option>)}
        </select>
      </Field>
      <Field label={`Bio (${(edit.bio || '').length}/100)`}>
        <textarea value={edit.bio || ''} onChange={e => setEdit(prev => ({ ...prev, bio: e.target.value }))} rows={4} maxLength={100}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      </Field>
      {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, paddingBottom: 20 }}>
        <button type="button" onClick={onCancel} disabled={loading} style={{ ...outlineButton, flex: 1 }}>Cancel</button>
        <button type="button" onClick={handleSave} disabled={loading} style={{ ...primaryButton, flex: 2, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
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
    <Modal title="Verify Email" onClose={onClose}>
      {step === 'send' ? (
        <>
          <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16 }}>
            We will send a 6-digit code to <strong>{email}</strong>
          </p>
          <button type="button" onClick={sendCode} disabled={loading} style={{ ...primaryButton, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Sending...' : 'Send Code'}
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 12 }}>Enter the 6-digit code sent to your email</p>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" maxLength={6}
            style={{ ...inputStyle, marginBottom: 12, textAlign: 'center', fontSize: 22, letterSpacing: 8 }} />
          <button type="button" onClick={verifyCode} disabled={loading || code.length !== 6} style={{ ...primaryButton, opacity: (loading || code.length !== 6) ? 0.7 : 1 }}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </>
      )}
      {msg && <p style={{ fontSize: 13, color: 'var(--blue)', marginTop: 10, textAlign: 'center' }}>{msg}</p>}
    </Modal>
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

function PhotoGallery({ photos, onDeleted }) {
  const [selected, setSelected] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const deletePhoto = async (e, photoId) => {
    e.stopPropagation()
    if (!window.confirm('Delete this photo?')) return

    setDeletingId(photoId)

    try {
      const res = await fetch(`${API}/deletePhotos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ photoID: photoId }),
      })

      if (!res.ok) {
        alert('Could not delete photo.')
        return
      }

      if (selected?.photo_id === photoId) setSelected(null)
      onDeleted()
    } catch {
      alert('Could not connect to server. Make sure it is running.')
    } finally {
      setDeletingId(null)
    }
  }

  if (photos.length === 0) return null

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {photos.map(photo => (
          <div key={photo.photo_id} style={{ position: 'relative', width: 80, height: 80 }}>
            <img
              src={`${API}/photo/${photo.photo_id}`}
              alt=""
              onClick={() => setSelected(photo)}
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, cursor: 'pointer' }}
            />
            <button type="button" onClick={(e) => deletePhoto(e, photo.photo_id)} disabled={deletingId === photo.photo_id} style={deleteButton}>
              x
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <img src={`${API}/photo/${selected.photo_id}`} alt="" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
          <button type="button" onClick={() => setSelected(null)} style={{ position: 'absolute', top: 20, right: 20, color: 'white', fontSize: 28, fontWeight: 700, background: 'none' }}>x</button>
          <button type="button" onClick={(e) => deletePhoto(e, selected.photo_id)} disabled={deletingId === selected.photo_id} style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', padding: '12px 20px', background: 'var(--red)', color: 'white', borderRadius: 12, fontWeight: 700 }}>
            {deletingId === selected.photo_id ? 'Deleting...' : 'Delete Photo'}
          </button>
        </div>
      )}
    </>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', marginBottom: 16 }}>{title}</h3>
        {children}
        <button type="button" onClick={onClose} style={{ width: '100%', marginTop: 16, padding: 13, background: 'var(--gray-100)', borderRadius: 12, fontWeight: 600, color: 'var(--gray-600)' }}>
          Close
        </button>
      </div>
    </div>
  )
}

const headerAction = { color: 'var(--white)', fontSize: 14, fontWeight: 600 }
const sectionTitle = { fontSize: 13, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }
const panelStyle = { background: 'var(--white)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 10, fontSize: 15, outline: 'none' }
const primaryButton = { width: '100%', padding: 14, background: 'var(--blue)', color: 'white', borderRadius: 12, fontWeight: 700, fontSize: 15 }
const secondaryButton = { width: '100%', padding: 14, background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 12, fontWeight: 700, fontSize: 15 }
const outlineButton = { padding: 14, background: 'var(--white)', color: 'var(--gray-600)', borderRadius: 12, fontWeight: 600, fontSize: 15, border: '1.5px solid var(--gray-200)' }
const modalButton = { display: 'block', width: '100%', padding: '14px 0', borderBottom: '1px solid var(--gray-200)', textAlign: 'left', fontSize: 15, fontWeight: 600 }
const deleteButton = { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', color: 'white', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }
const modalStyle = { background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }
