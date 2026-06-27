import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d1117' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 32, color: '#e6edf3', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
