import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { navigate('/login'); return }

    api.get('/users/me')
      .then(() => setChecked(true))
      .catch((e) => {
        if (e.response?.status === 404) {
          navigate('/onboarding')
        }
      })
  }, [user, loading, navigate])

  if (!checked) return null
  return <>{children}</>
}
