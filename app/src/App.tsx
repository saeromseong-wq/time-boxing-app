import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { FocusProvider } from './features/timer/FocusContext'
import LoginPage from './features/auth/LoginPage'
import Layout from './components/Layout'
import TodayPage from './features/timeline/TodayPage'
import TimerPage from './features/timer/TimerPage'
import StatsPage from './features/stats/StatsPage'
import TasksPage from './features/tasks/TasksPage'

function Gate() {
  const { session, loading } = useAuth()
  if (loading) {
    return <div className="mt-32 text-center text-sm text-neutral-400">불러오는 중…</div>
  }
  if (!session) return <LoginPage />
  return (
    <FocusProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TodayPage />} />
          <Route path="timer" element={<TimerPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FocusProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
