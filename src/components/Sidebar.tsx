import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

const links = [
  { to: '/',            label: 'ダッシュボード' },
  { to: '/users',       label: '利用者管理' },
  { to: '/documents',   label: '文書管理' },
  { to: '/accounting',  label: '会計管理' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#0d1117',
      borderRight: '1px solid #21262d',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 16px 24px', borderBottom: '1px solid #21262d' }}>
        <span style={{ color: '#e6edf3', fontWeight: 600, fontSize: 15 }}>
          ftn-oasis
        </span>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'block',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 14,
              textDecoration: 'none',
              marginBottom: 2,
              color: isActive ? '#e6edf3' : '#8b949e',
              background: isActive ? '#21262d' : 'transparent',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid #21262d' }}>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #21262d',
            background: 'transparent',
            color: '#8b949e',
            fontSize: 14,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          サインアウト
        </button>
      </div>
    </aside>
  )
}
