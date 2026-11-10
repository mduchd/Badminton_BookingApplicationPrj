import { useState } from 'react'
import { X } from 'lucide-react'
import { DialogFrame } from '../../../components/shared/DialogFrame'
import { Button } from '../../../components/shared/Button'
import { ProfileForm } from './ProfileForm'
import { IntegrationSettings } from '../account/IntegrationSettings'
import type { User } from '../../types/user'

interface ProfileModalProps {
  isOpen: boolean; user: User; onClose: () => void; onUpdateUser: (user: User) => void; onLogout: () => void
}
export function ProfileModal(props: ProfileModalProps) {
  return props.isOpen ? <ProfileContent key={props.user.id} {...props} /> : null
}
function ProfileContent({ user, onClose, onUpdateUser, onLogout }: ProfileModalProps) {
  const [tab, setTab] = useState<'info' | 'settings'>('info')
  return <DialogFrame label="Tài khoản" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3">
    <div className="flex w-full max-w-xl max-h-[min(90vh,700px)] flex-col overflow-hidden rounded-2xl bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-5"><h2 className="text-lg font-bold text-slate-900">Tài khoản</h2><Button variant="secondary" className="border-0 p-2" aria-label="Đóng" onClick={onClose}><X className="h-5 w-5" /></Button></div>
      <div className="flex shrink-0 gap-2 border-b border-slate-200 p-3" role="tablist" aria-label="Tài khoản">
        <button type="button" role="tab" aria-selected={tab==='info'} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-slate-800" onClick={() => setTab('info')}>Hồ sơ tài khoản</button>
        <button type="button" role="tab" aria-selected={tab==='settings'} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-slate-800" onClick={() => setTab('settings')}>Thông báo & Đồng bộ</button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">{tab==='info' ? <ProfileForm user={user} onSaved={onUpdateUser} /> : <IntegrationSettings user={user} onUpdated={onUpdateUser} />}</div>
      <div className="shrink-0 border-t border-slate-200 p-5"><Button variant="danger" onClick={() => { onLogout(); onClose() }}>Đăng xuất</Button></div>
    </div>
  </DialogFrame>
}
