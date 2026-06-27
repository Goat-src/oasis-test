import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import DocumentsPage from './pages/DocumentsPage'
import AccountingPage from './pages/AccountingPage'

function Onboarding() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#e6edf3' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: 8 }}>アカウント未登録</h1>
        <p style={{ color: '#8b949e' }}>管理者にお問い合わせください。</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/oasis-test">
      <Routes>
        <Route path="/login"      element={<LoginPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<AuthGuard><Layout /></AuthGuard>}>
          <Route path="/"           element={<DashboardPage />} />
          <Route path="/users"      element={<UsersPage />} />
          <Route path="/documents"  element={<DocumentsPage />} />
          <Route path="/accounting" element={<AccountingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
