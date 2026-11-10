import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { DialogFrame } from '../../../components/shared/DialogFrame'
import { Button } from '../../../components/shared/Button'
import { FormField } from '../../../components/shared/FormField'
import { accountApi } from '../account/accountApi'
import { errorMessage } from '../../../lib/errors'
import { authStorage } from './authApi'

export function PasswordRecovery({ token, onClose, onReset }: { token?: string; onClose: () => void; onReset?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (token && password !== confirmation) { setError('Hai mật khẩu chưa khớp.'); return }
    setBusy(true); setError('')
    try {
      if (token) { await accountApi.resetPassword(token, password); authStorage.removeToken(); onReset?.() }
      else await accountApi.forgotPassword(email.trim())
      setSent(true)
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <DialogFrame label={token ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'} onClose={onClose} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-3">
    <div className="flex w-full max-w-md max-h-[min(90vh,700px)] flex-col overflow-hidden rounded-2xl bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-5"><h2 className="text-lg font-bold text-slate-900">{token ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}</h2><Button variant="secondary" className="border-0 p-2" aria-label="Đóng" onClick={onClose}><X className="h-5 w-5" /></Button></div>
      <div className="flex-1 overflow-y-auto p-5">
        {sent ? <div role="status" className="space-y-4"><p className="text-sm leading-relaxed text-slate-700">{token ? 'Đã đổi mật khẩu. Hãy đăng nhập lại bằng mật khẩu mới.' : 'Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được liên kết đặt lại mật khẩu. Kiểm tra cả thư rác; liên kết có hiệu lực trong 20 phút.'}</p><Button onClick={onClose}>Đã hiểu</Button></div>
          : <form id="password-recovery" onSubmit={submit} className="space-y-4">
            {token ? <><FormField label="Mật khẩu mới" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} required hint="Từ 8 đến 72 ký tự." /><FormField label="Nhập lại mật khẩu" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required /></> : <><p className="text-sm text-slate-600">Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.</p><FormField label="Email đăng ký" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></>}
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          </form>}
      </div>
      {!sent && <div className="shrink-0 border-t border-slate-200 p-5"><Button form="password-recovery" type="submit" busy={busy} className="w-full">{busy ? 'Đang xử lý…' : token ? 'Lưu mật khẩu mới' : 'Gửi liên kết'}</Button></div>}
    </div>
  </DialogFrame>
}
