import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

interface User {
  id: string
  last_name: string
  first_name: string
  email: string
  status: string
  joined_at: string
}

interface CreateForm {
  last_name: string
  first_name: string
  last_name_kana: string
  first_name_kana: string
  email: string
  user_type_id: number
  joined_at: string
}

const inputStyle: React.CSSProperties = {
  background: '#0d1117',
  border: '1px solid #21262d',
  borderRadius: 6,
  color: '#e6edf3',
  padding: '5px 10px',
  fontSize: 13,
  width: '100%',
}

const btnStyle: React.CSSProperties = {
  padding: '5px 14px',
  borderRadius: 6,
  border: '1px solid #21262d',
  background: '#21262d',
  color: '#e6edf3',
  fontSize: 13,
  cursor: 'pointer',
}

export default function UsersPage() {
  const [users, setUsers]         = useState<User[]>([])
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const fileRef                   = useRef<HTMLInputElement>(null)
  const [form, setForm]           = useState<CreateForm>({
    last_name: '', first_name: '', last_name_kana: '',
    first_name_kana: '', email: '', user_type_id: 1,
    joined_at: new Date().toISOString().slice(0, 10),
  })

  // 警告解消のため useCallback で関数をメモ化
  const load = useCallback((name?: string) => {
    api.get('/users', { params: { name } }).then(r => setUsers(r.data))
  }, [])

  // load を依存配列に追加
  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(search || undefined)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/users', form)
    setShowForm(false)
    load()
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post('/users/import', fd)
    alert(`インポート完了: ${res.data.inserted} 件\nエラー: ${res.data.errors.join('\n') || 'なし'}`)
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>利用者管理</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* type="button" を追加 */}
          <button type="button" style={btnStyle} onClick={() => fileRef.current?.click()}>
            CSV インポート
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
          {/* type="button" を追加 */}
          <button type="button" style={{ ...btnStyle, background: '#238636', borderColor: '#238636' }}
            onClick={() => setShowForm(v => !v)}>
            ＋ 利用者を追加
          </button>
        </div>
      </div>

      {/* 検索 */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input style={{ ...inputStyle, width: 240 }} placeholder="氏名・カナで検索"
          value={search} onChange={e => setSearch(e.target.value)} />
        <button type="submit" style={btnStyle}>検索</button>
      </form>

      {/* 登録フォーム */}
      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: '#161b22', border: '1px solid #21262d',
          borderRadius: 8, padding: 20, marginBottom: 20,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {([
            ['last_name',       '姓'],
            ['first_name',      '名'],
            ['last_name_kana',  '姓（カナ）'],
            ['first_name_kana', '名（カナ）'],
            ['email',           'メールアドレス'],
            ['joined_at',       '入会日'],
          ] as const).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#8b949e' }}>{label}</span>
              <input style={inputStyle} value={form[key]}
                type={key === 'joined_at' ? 'date' : 'text'}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
            </label>
          ))}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnStyle} onClick={() => setShowForm(false)}>キャンセル</button>
            <button type="submit" style={{ ...btnStyle, background: '#238636', borderColor: '#238636' }}>登録</button>
          </div>
        </form>
      )}

      {/* 一覧 */}
      <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #21262d' }}>
              {['氏名', 'メール', 'ステータス', '入会日'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #21262d' }}>
                <td style={{ padding: '10px 16px' }}>{u.last_name} {u.first_name}</td>
                <td style={{ padding: '10px 16px', color: '#8b949e' }}>{u.email}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 11,
                    background: u.status === 'active' ? '#1a3f1a' : '#3f1a1a',
                    color:      u.status === 'active' ? '#3fb950' : '#f85149',
                  }}>{u.status}</span>
                </td>
                <td style={{ padding: '10px 16px', color: '#8b949e' }}>{u.joined_at}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#8b949e' }}>利用者が見つかりません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
