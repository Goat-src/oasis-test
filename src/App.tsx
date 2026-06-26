import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import LoginPage from './pages/LoginPage'

function Dashboard() { return <div>ダッシュボード（実装予定）</div> }
function Onboarding() { return <div>未登録ユーザー向け画面（実装予定）</div> }

export default function App() {
  return (
    <BrowserRouter basename="/oasis-test">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/*" element={<AuthGuard><Dashboard /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  )
}
