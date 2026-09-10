import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function prepareSession() {
      // 최신 Supabase 재설정 링크는 해시 토큰이 아니라 ?code= 쿼리로 오는 PKCE 방식이라, 세션으로 직접 교환해야 한다.
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setSessionError(error.message)
          setReady(true)
          return
        }
      }
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setSessionError('링크가 만료됐거나 이미 사용됐어요. 비밀번호 재설정 메일을 다시 요청해주세요.')
      }
      setReady(true)
    }
    prepareSession()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('비밀번호가 서로 달라요.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) setError(error.message)
      else setDone(true)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto mt-24 max-w-sm px-4 text-center">
        <h1 className="mb-2 text-lg font-bold">비밀번호가 변경됐어요</h1>
        <p className="mb-6 text-sm text-neutral-500">새 비밀번호로 다시 로그인해주세요.</p>
        <a
          href="/"
          className="inline-block w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          로그인하러 가기
        </a>
      </div>
    )
  }

  if (!ready) {
    return <div className="mt-32 text-center text-sm text-neutral-400">확인하는 중…</div>
  }

  if (sessionError) {
    return (
      <div className="mx-auto mt-24 max-w-sm px-4 text-center">
        <h1 className="mb-2 text-lg font-bold">링크를 사용할 수 없어요</h1>
        <p className="mb-6 text-sm text-neutral-500">{sessionError}</p>
        <a
          href="/"
          className="inline-block w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          로그인 화면으로
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-1 text-center text-2xl font-bold">새 비밀번호 설정</h1>
      <p className="mb-8 text-center text-sm text-neutral-500">DeepBox 계정의 새 비밀번호를 입력하세요.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          required
          minLength={6}
          placeholder="새 비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="새 비밀번호 확인"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          비밀번호 변경
        </button>
      </form>
    </div>
  )
}
