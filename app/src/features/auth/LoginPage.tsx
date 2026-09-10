import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase, supabaseConfigured } from '../../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        })
        if (error) setError(error.message)
        else if (!data.session) setInfo('확인 메일을 보냈어요. 메일함에서 인증 후 로그인해주세요.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) setError(error.message)
        else setInfo('비밀번호 재설정 메일을 보냈어요. 메일함을 확인해주세요.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (!supabaseConfigured) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm leading-6 dark:border-amber-700 dark:bg-amber-950">
        <h1 className="mb-2 text-lg font-bold">Supabase 설정이 필요해요</h1>
        <ol className="list-decimal space-y-1 pl-5">
          <li>supabase.com에서 프로젝트를 만들고</li>
          <li>SQL Editor에서 <code>supabase/schema.sql</code>을 실행한 뒤</li>
          <li><code>app/.env.local</code>에 URL과 anon key를 입력하고 개발 서버를 재시작하세요.</li>
        </ol>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-1 text-center text-2xl font-bold">DeepBox</h1>
      <p className="mb-8 text-center text-sm text-neutral-500">타임박싱 + 몰입 타이머</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        {mode !== 'forgot' && (
          <input
            type="password"
            required
            minLength={6}
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-emerald-600">{info}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {mode === 'signin' ? '로그인' : mode === 'signup' ? '회원가입' : '재설정 메일 보내기'}
        </button>
      </form>
      {mode === 'signin' && (
        <button
          onClick={() => setMode('forgot')}
          className="mt-4 w-full text-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          비밀번호를 잊으셨나요?
        </button>
      )}
      {mode === 'forgot' ? (
        <button
          onClick={() => setMode('signin')}
          className="mt-2 w-full text-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          로그인으로 돌아가기
        </button>
      ) : (
        <button
          onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
          className="mt-2 w-full text-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          {mode === 'signup' ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
        </button>
      )}
    </div>
  )
}
