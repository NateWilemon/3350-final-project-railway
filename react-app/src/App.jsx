import { useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import CreateProfile from './pages/CreateProfile'
import Discover from './pages/Discover'
import Matches from './pages/Matches'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import './index.css'

export default function App() {
  const [page, setPage] = useState('login')
  const [activeChat, setActiveChat] = useState(null)

  const navigate = (p, data = null) => {
    if (p === 'chat') setActiveChat(data)
    setPage(p)
  }

  if (page === 'login')
    return <Login onLogin={(userId) => navigate('discover')} onRegister={() => navigate('register')} />
  if (page === 'register')
    return <Register onBack={() => navigate('login')} onNext={() => navigate('create-profile')} />
  if (page === 'create-profile')
    return <CreateProfile onDone={() => navigate('discover')} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--nav-height)' }}>
        {page === 'discover'  && <Discover navigate={navigate} />}
        {page === 'matches'   && <Matches navigate={navigate} />}
        {page === 'messages'  && <Messages navigate={navigate} />}
        {page === 'chat'      && <Chat match={activeChat} navigate={navigate} />}
        {page === 'profile'   && <Profile navigate={navigate} />}
      </div>
      <BottomNav page={page} navigate={navigate} />
    </div>
  )
}

function BottomNav({ page, navigate }) {
  const tabs = [
    { key: 'discover', label: 'Discover', icon: <FlameIcon /> },
    { key: 'matches',  label: 'Matches',  icon: <HeartNavIcon /> },
    { key: 'messages', label: 'Messages', icon: <ChatNavIcon /> },
    { key: 'profile',  label: 'Profile',  icon: <PersonIcon /> },
  ]
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'var(--nav-height)',
      background: 'var(--white)',
      borderTop: '1px solid var(--gray-200)',
      display: 'flex', alignItems: 'center',
      zIndex: 100,
    }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => navigate(t.key)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, padding: '8px 0',
            color: page === t.key ? 'var(--blue)' : 'var(--gray-400)',
            transition: 'color .15s',
          }}>
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontWeight: page === t.key ? 700 : 500 }}>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

function FlameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c0 0-5 4.5-5 9a5 5 0 0010 0c0-4.5-5-9-5-9zm0 12a2 2 0 01-2-2c0-1.5 2-4 2-4s2 2.5 2 4a2 2 0 01-2 2z"/>
    </svg>
  )
}
function HeartNavIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  )
}
function ChatNavIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}