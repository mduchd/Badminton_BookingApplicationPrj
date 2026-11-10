import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '../../../components/shared/Button'
import { errorMessage } from '../../../lib/errors'
import { API_BASE_URL } from '../../../lib/apiConfig'
import { authApi } from '../auth/authApi'
import { accountApi } from './accountApi'
import { enablePush, disablePush, pushConfigured } from '../notification/pushClient'
import type { User } from '../../types/user'

export function IntegrationSettings({ user, onUpdated }: { user: User; onUpdated: (user: User) => void }) {
  const capabilities = useQuery({ queryKey: ['accountIntegrations', user.id], queryFn: accountApi.integrations })
  const [busy, setBusy] = useState<'push' | 'calendar' | null>(null)
  const [error, setError] = useState('')
  const [popup, setPopup] = useState<Window | null>(null)
  const expectedOrigin = useRef(new URL(API_BASE_URL, window.location.origin).origin)
  const finishCalendar = useEffectEvent(async (result: string) => {
    setPopup(null); setBusy(null)
    if (result !== 'success') { setError('Chưa kết nối được Google Calendar. Bạn có thể thử lại.'); return }
    try {
      const updated = await authApi.getMe()
      if (!updated?.calendarConnected) throw new Error('Chưa xác nhận được kết nối lịch. Vui lòng thử lại.')
      onUpdated(updated); toast.success('Đã kết nối Google Calendar')
    } catch (err) { setError(errorMessage(err)) }
  })
  useEffect(() => {
    if (!popup) return
    const receive = (event: MessageEvent) => {
      if (event.source === popup && event.origin === expectedOrigin.current && event.data?.type === 'smashcourt-calendar') void finishCalendar(event.data.result)
    }
    const timer = window.setInterval(() => { if (popup.closed) { setPopup(null); setBusy(null) } }, 500)
    window.addEventListener('message', receive)
    return () => { window.clearInterval(timer); window.removeEventListener('message', receive) }
  }, [popup])
  const togglePush = async () => {
    setBusy('push'); setError('')
    try {
      onUpdated(await (user.fcmEnabled ? disablePush() : enablePush()))
      toast.success(user.fcmEnabled ? 'Đã tắt thông báo' : 'Đã bật thông báo')
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(null) }
  }
  const toggleCalendar = async () => {
    setError(''); setBusy('calendar')
    if (user.calendarConnected) {
      try { onUpdated(await accountApi.disconnectCalendar()); toast.success('Đã ngắt kết nối lịch') }
      catch (err) { setError(errorMessage(err)) }
      finally { setBusy(null) }
      return
    }
    const opened = window.open('about:blank', 'smashcourt-calendar', 'popup,width=520,height=700')
    if (!opened) { setError('Trình duyệt đang chặn cửa sổ kết nối. Hãy cho phép cửa sổ bật lên và thử lại.'); setBusy(null); return }
    try {
      const { url, callbackOrigin } = await accountApi.connectCalendar()
      const target = new URL(url)
      if (target.origin !== 'https://accounts.google.com') throw new Error('Liên kết kết nối lịch không hợp lệ.')
      if (callbackOrigin) expectedOrigin.current = callbackOrigin
      setPopup(opened); opened.location.href = url
    } catch (err) { opened.close(); setBusy(null); setError(errorMessage(err)) }
  }
  if (capabilities.isPending) return <p role="status" className="text-sm text-slate-600">Đang tải kết nối tài khoản…</p>
  if (capabilities.isError) return <div className="space-y-3"><p role="alert" className="text-sm text-rose-700">Không thể tải kết nối tài khoản.</p><Button variant="secondary" onClick={() => void capabilities.refetch()}>Thử lại</Button></div>
  return <div className="divide-y divide-slate-200">
    <div className="flex flex-wrap items-center justify-between gap-4 py-5">
      <div className="min-w-0 flex-1 basis-56"><h3 className="text-sm font-semibold text-slate-900">Thông báo trình duyệt</h3>
        <p className="mt-1 text-sm text-slate-600">{capabilities.data.push && pushConfigured ? 'Nhận cập nhật khi đơn đặt sân được xác nhận, hoàn thành hoặc hủy. Tắt thông báo sẽ áp dụng cho mọi thiết bị.' : 'Thông báo trình duyệt hiện chưa khả dụng. Bạn vẫn có thể xem trạng thái đơn trong Tài khoản.'}</p></div>
      <Button variant="secondary" disabled={!!busy || (!user.fcmEnabled && !(capabilities.data.push && pushConfigured))} busy={busy === 'push'} onClick={() => void togglePush()}>{user.fcmEnabled ? 'Tắt thông báo' : 'Bật thông báo'}</Button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4 py-5">
      <div className="min-w-0 flex-1 basis-56"><h3 className="text-sm font-semibold text-slate-900">Google Calendar</h3>
        <p className="mt-1 text-sm text-slate-600">{user.calendarConnected ? `Đã kết nối ${user.calendarEmail || ''}. Lịch của đơn sắp tới được cập nhật tự động; ngắt kết nối sẽ giữ các sự kiện đã thêm.` : capabilities.data.calendar ? 'Tự động thêm đơn đã xác nhận vào lịch và xóa sự kiện khi hủy đơn. Cập nhật có thể mất khoảng một phút.' : 'Đồng bộ tự động hiện chưa khả dụng. Bạn có thể tải lịch của từng đơn đã xác nhận.'}</p></div>
      <Button variant="secondary" disabled={!!busy || (!user.calendarConnected && !capabilities.data.calendar)} busy={busy === 'calendar'} onClick={() => void toggleCalendar()}>{user.calendarConnected ? 'Ngắt kết nối' : 'Kết nối lịch'}</Button>
    </div>
    {error && <p role="alert" className="py-4 text-sm text-rose-700">{error}</p>}
  </div>
}
