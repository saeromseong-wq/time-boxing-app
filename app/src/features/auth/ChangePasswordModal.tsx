import { useState } from 'react'
import type { FormEvent } from 'react'
import Modal from '../../components/Modal'
import { supabase } from '../../lib/supabase'

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

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

  return (
    <Modal title="비밀번호 변경" onClose={onClose}>
      {done ? (
        <p className="text-sm text-emerald-600">비밀번호가 변경됐어요.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            required
            minLength={6}
            autoFocus
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
            변경하기
          </button>
        </form>
      )}
    </Modal>
  )
}
