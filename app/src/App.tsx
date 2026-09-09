import { Outlet } from 'react-router-dom'
import { useAuth } from './features/auth/AuthContext'
import { FocusProvider } from './features/timer/FocusContext'
import LoginPage from './features/auth/LoginPage'

/** 라우터 루트 요소 — 인증 상태를 확인한 뒤 하위 라우트를 렌더링한다.
 * useBlocker(페이지 이탈 확인)가 데이터 라우터를 요구해서 createBrowserRouter로 구성했다. */
export default function Gate() {
  const { session, loading } = useAuth()
  if (loading) {
    return <div className="mt-32 text-center text-sm text-neutral-400">불러오는 중…</div>
  }
  if (!session) return <LoginPage />
  return (
    <FocusProvider>
      <Outlet />
    </FocusProvider>
  )
}
