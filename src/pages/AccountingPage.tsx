import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

interface PaymentRequest {
  id: string
  description: string
  payee: string
  amount: string
  status: string
  requested_at: string
}

interface CreateForm {
  description: string
  payee: string
  amount: string
}

const inputStyle: React.CSSProperties = {
  background: '#0d1117', border: '1px solid #21262d',
  borderRadius: 6, color: '#e6edf3',
  padding: '5px 10px', fontSize: 13, width: '100%',
}
const btnStyle: React.CSSProperties = {
  padding: '5px 14px', borderRadius: 6,
  border: '1px solid #21262d', background: '#21262d',
  color: '#e6edf3', fontSize: 13, cursor: 'pointer',
}

const statusColor = (s: string) => ({
  pending:  { bg: '#2a2a1a', text: '#e3b341' },
  approved: { bg: '#1a3f1a', text: '#3fb950' },
  rejected: { bg: '#3f1a1a', text: '#f85149' },
  paid:     { bg: '#1a2a3f', text: '#58a6ff' },
}[s] ?? { bg: '#21262d', text: '#8b949e' })

export default function AccountingPage() {
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState<CreateForm>({ description: '', payee: '', amount: '' })

  const load = useCallback(() => {
    api.get('/accounting/payments').then(r => setPayments(r.data))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/accounting/payments', {
      ...form,
      amount: parseFloat(form.amount),
      requested_by: '00000000-0000-0000-0000-000000000000',
    })
    setShowForm(false)
    setForm({ description: '', payee: '', amount: '' })
    load()
  }

  const handleApprove = async (id: string) => {
    await api.post(`/accounting/payments/${id}/approve`)
    load()
  }

  const handleReject = async (id: string) => {
    await api.post(`/accounting/payments/${id}/reject`)
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>会計管理 — 支払申請</h1>
        <button
          type="button"
          style={{ ...btnStyle, background: '#238636', borderColor: '#238636' }}
          onClick={() => setShowForm(v => !v)}
        >
          ＋ 申請
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: '#161b22', border: '1px solid #21262d',
          borderRadius: 8, padding: 20, marginBottom: 20,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#8b949e' }}>内容</span>
            <input style={inputStyle} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#8b949e' }}>支払先</span>
            <input style={inputStyle} value={form.payee}
              onChange={e => setForm(f => ({ ...f, payee: e.target.value }))} required />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#8b949e' }}>金額（円）</span>
            <input style={inputStyle} type="number" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnStyle} onClick={() => setShowForm(false)}>キャンセル</button>
            <button type="submit" style={{ ...btnStyle, background: '#238636', borderColor: '#238636' }}>申請</button>
          </div>
        </form>
      )}

      <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #21262d' }}>
              {['内容', '支払先', '金額', 'ステータス', '申請日時', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => {
              const c = statusColor(p.status)
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '10px 16px' }}>{p.description}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{p.payee}</td>
                  <td style={{ padding: '10px 16px' }}>¥{Number(p.amount).toLocaleString()}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: c.bg, color: c.text }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{new Date(p.requested_at).toLocaleString('ja-JP')}</td>
                  <td style={{ padding: '10px 16px' }}>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          style={{ ...btnStyle, borderColor: '#3fb950', color: '#3fb950' }}
                          onClick={() => handleApprove(p.id)}
                        >
                          承認
                        </button>
                        <button
                          type="button"
                          style={{ ...btnStyle, borderColor: '#f85149', color: '#f85149' }}
                          onClick={() => handleReject(p.id)}
                        >
                          却下
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {payments.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#8b949e' }}>申請がありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
