import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // すでにログイン済みなら直接ダッシュボードへ
  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 16,
      background: '#0d1117', color: '#e6edf3',
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>oasis-test</h1>
      <button
        type="button"
        onClick={handleLogin}
        style={{
          padding: '8px 20px', borderRadius: 6,
          border: '1px solid #21262d', background: '#21262d',
          color: '#e6edf3', fontSize: 14, cursor: 'pointer',
        }}
      >
        Google でログイン
      </button>
    </div>
  )
}
