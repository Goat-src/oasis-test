import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Stats {
  users: number
  documents: number
  payments: number
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #21262d',
      borderRadius: 8,
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: '#e6edf3' }}>{value}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ users: 0, documents: 0, payments: 0 })

  useEffect(() => {
    Promise.all([
      api.get('/users').then(r => r.data.length),
      api.get('/files/documents').then(r => r.data.length),
      api.get('/accounting/payments').then(r => r.data.length),
    ]).then(([users, documents, payments]) => {
      setStats({ users, documents, payments })
    }).catch(() => {})
  }, [])

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>ダッシュボード</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="利用者数" value={stats.users} />
        <StatCard label="文書数"   value={stats.documents} />
        <StatCard label="支払申請" value={stats.payments} />
      </div>
    </>
  )
}
