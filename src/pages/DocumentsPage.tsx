import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Document {
  id: string
  title: string
  description: string | null
  created_at: string
}

interface Version {
  id: string
  version_no: number
  file_name: string
  uploaded_at: string
  deleted_at: string | null
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

export default function DocumentsPage() {
  const [docs, setDocs]           = useState<Document[]>([])
  const [selected, setSelected]   = useState<Document | null>(null)
  const [versions, setVersions]   = useState<Version[]>([])
  const [showForm, setShowForm]   = useState(false)
  const [title, setTitle]         = useState('')

  const loadDocs = () => api.get('/files/documents').then(r => setDocs(r.data))

  useEffect(() => { loadDocs() }, [])

  const selectDoc = (doc: Document) => {
    setSelected(doc)
    api.get(`/files/documents/${doc.id}/versions`).then(r => setVersions(r.data))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/files/documents', { title })
    setShowForm(false)
    setTitle('')
    loadDocs()
  }

  const handleDelete = async (versionId: string) => {
    await api.post(`/files/versions/${versionId}/delete`)
    if (selected) selectDoc(selected)
  }

  const handleRestore = async (versionId: string) => {
    await api.post(`/files/versions/${versionId}/restore`)
    if (selected) selectDoc(selected)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
      {/* 文書一覧 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>文書管理</h1>
          <button style={{ ...btnStyle, background: '#238636', borderColor: '#238636' }}
            onClick={() => setShowForm(v => !v)}>＋</button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={{ marginBottom: 12, display: 'flex', gap: 6 }}>
            <input style={inputStyle} placeholder="文書タイトル" value={title}
              onChange={e => setTitle(e.target.value)} required />
            <button type="submit" style={btnStyle}>作成</button>
          </form>
        )}

        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
          {docs.map(doc => (
            <div key={doc.id}
              onClick={() => selectDoc(doc)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid #21262d',
                background: selected?.id === doc.id ? '#21262d' : 'transparent',
                color: selected?.id === doc.id ? '#e6edf3' : '#8b949e',
              }}>
              {doc.title}
            </div>
          ))}
          {docs.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: '#8b949e' }}>文書がありません</div>
          )}
        </div>
      </div>

      {/* バージョン一覧 */}
      <div>
        {selected ? (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{selected.title}</h2>
            <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #21262d' }}>
                    {['バージョン', 'ファイル名', 'アップロード日時', '操作'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {versions.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #21262d', opacity: v.deleted_at ? 0.4 : 1 }}>
                      <td style={{ padding: '10px 16px' }}>v{v.version_no}</td>
                      <td style={{ padding: '10px 16px' }}>{v.file_name}</td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>{new Date(v.uploaded_at).toLocaleString('ja-JP')}</td>
                      <td style={{ padding: '10px 16px' }}>
                        {v.deleted_at
                          ? <button style={btnStyle} onClick={() => handleRestore(v.id)}>復元</button>
                          : <button style={{ ...btnStyle, borderColor: '#f85149', color: '#f85149' }}
                              onClick={() => handleDelete(v.id)}>削除</button>
                        }
                      </td>
                    </tr>
                  ))}
                  {versions.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#8b949e' }}>バージョンがありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ color: '#8b949e', fontSize: 13, marginTop: 48, textAlign: 'center' }}>
            左の文書を選択してください
          </div>
        )}
      </div>
    </div>
  )
}
