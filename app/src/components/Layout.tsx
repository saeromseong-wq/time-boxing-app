import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MiniTimerBar from '../features/timer/MiniTimerBar'

const tabs = [
  { to: '/', label: '오늘' },
  { to: '/stats', label: '통계' },
  { to: '/tasks', label: 'Task' },
]

export default function Layout() {
  const location = useLocation()
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      {location.pathname !== '/timer' && <MiniTimerBar />}
      <header className="flex items-center gap-1 px-4 py-3">
        <span className="mr-3 text-lg font-black tracking-tight">DeepBox</span>
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
        <button
          onClick={() => supabase.auth.signOut()}
          className="ml-auto text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          로그아웃
        </button>
      </header>
      <main className="flex-1 px-4 pb-24">
        <Outlet />
      </main>
    </div>
  )
}
