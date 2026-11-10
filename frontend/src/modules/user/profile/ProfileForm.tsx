import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '../../../components/shared/Button'
import { FormField } from '../../../components/shared/FormField'
import { accountApi } from '../account/accountApi'
import { errorMessage } from '../../../lib/errors'
import type { User } from '../../types/user'

export function ProfileForm({ user, onSaved }: { user: User; onSaved: (user: User) => void }) {
  const [name, setName] = useState(user.fullName)
  const [phone, setPhone] = useState(user.phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError('')
    try {
      const updated = await accountApi.updateProfile(name.trim(), phone.trim())
      onSaved(updated); setName(updated.fullName); setPhone(updated.phone || '')
      toast.success('Đã lưu hồ sơ')
    } catch (err) { setError(errorMessage(err)) }
    finally { setSaving(false) }
  }
  return <form onSubmit={save} className="space-y-5">
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <FormField label="Họ và tên" value={name} onChange={e => setName(e.target.value)} required maxLength={120} autoComplete="name" />
      <FormField label="Email đăng ký" value={user.email} disabled type="email" />
      <FormField label="Số điện thoại liên hệ" value={phone} onChange={e => setPhone(e.target.value)} type="tel" maxLength={30} autoComplete="tel" hint="Nhập số điện thoại Việt Nam, ví dụ 0912345678." />
    </div>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <div className="border-t border-slate-100 pt-4"><Button type="submit" busy={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</Button></div>
  </form>
}
