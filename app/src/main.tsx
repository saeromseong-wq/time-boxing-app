import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import './index.css'
import Gate from './App'
import { AuthProvider } from './features/auth/AuthContext'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import Layout from './components/Layout'
import TodayPage from './features/timeline/TodayPage'
import TimerPage from './features/timer/TimerPage'
import StatsPage from './features/stats/StatsPage'
import TasksPage from './features/tasks/TasksPage'

const router = createBrowserRouter([
  { path: 'reset-password', element: <ResetPasswordPage /> },
  {
    element: <Gate />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <TodayPage /> },
          { path: 'timer', element: <TimerPage /> },
          { path: 'stats', element: <StatsPage /> },
          { path: 'tasks', element: <TasksPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
