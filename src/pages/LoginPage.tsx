import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

export default function LoginPage() {
  const handleLogin = async () => {
    await signInWithPopup(auth, googleProvider)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h1>oasis-test</h1>
      <button type="button" onClick={handleLogin}>Google でログイン</button>
    </div>
  )
}
