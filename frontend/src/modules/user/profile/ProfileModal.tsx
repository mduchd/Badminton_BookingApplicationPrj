import React, { useState } from 'react'
import { X, User as UserIcon, Mail, Phone, Shield, Bell, Calendar, Check, AlertCircle, LogOut } from 'lucide-react'
import type { User } from '../../types/user'
import { toast } from 'sonner'

interface ProfileModalProps {
  isOpen: boolean
  user: User
  onClose: () => void
  onUpdateUser: (updated: User) => void
  onLogout: () => void
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onUpdateUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'settings'>('info')
  const [fullName, setFullName] = useState(user.fullName)
  const [phone, setPhone] = useState(user.phone || '')
  const [fcmEnabled, setFcmEnabled] = useState(user.fcmEnabled ?? false)
  const [calendarConnected, setCalendarConnected] = useState(user.calendarConnected ?? false)

  if (!isOpen) return null

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdateUser({
      ...user,
      fullName,
      phone,
    })
    toast.success('Cập nhật thông tin cá nhân thành công!')
  }

  const handleToggleFCM = () => {
    const nextState = !fcmEnabled
    setFcmEnabled(nextState)
    onUpdateUser({
      ...user,
      fcmEnabled: nextState,
    })
    if (nextState) {
      toast.success('Đã cấp quyền & đăng ký FCM Web Push token thành công! 🔔')
    } else {
      toast.info('Đã hủy đăng ký Web Push trên thiết bị này.')
    }
  }

  const handleToggleCalendar = () => {
    if (!calendarConnected) {
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 800)),
        {
          loading: 'Đang mở luồng OAuth2 xin quyền Google Calendar...',
          success: () => {
            setCalendarConnected(true)
            onUpdateUser({
              ...user,
              calendarConnected: true,
              calendarEmail: user.email,
            })
            return 'Đã kết nối tài khoản Google Calendar thành công! 📅'
          },
          error: 'Kết nối Google Calendar thất bại',
        }
      )
    } else {
      setCalendarConnected(false)
      onUpdateUser({
        ...user,
        calendarConnected: false,
        calendarEmail: undefined,
      })
      toast.info('Đã hủy liên kết Google Calendar.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overlay-enter">
      <div className="relative w-full max-w-lg max-h-[min(90vh,700px)] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user.fullName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/20"
            />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{user.fullName}</h3>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 text-xs font-semibold px-3 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'info'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Hồ sơ tài khoản
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-xs font-semibold px-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Thông báo & Đồng bộ</span>
            {(fcmEnabled || calendarConnected) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'info' ? (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email đăng ký</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-medium cursor-not-allowed"
                  />
                </div>
                {user.provider === 'GOOGLE' && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> Xác thực qua Google OpenID Connect
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0988 123 456"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vai trò tài khoản</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <Shield className="w-4 h-4 text-[#1b7a42]" />
                  <span className="font-semibold text-slate-800">
                    {user.role === 'COURT_OWNER' ? 'Chủ sân' : 'Khách hàng'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onLogout()
                    onClose()
                    toast.info('Đã đăng xuất tài khoản')
                  }}
                  className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng xuất
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Web Push Notification */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Thông báo trình duyệt (FCM Web Push)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Nhận thông báo xác nhận đơn đặt sân & nhắc nhở giờ thi đấu ngay cả khi tab trình duyệt đang đóng.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleFCM}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 cursor-pointer ${
                    fcmEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
              </div>

              {/* Google Calendar Sync */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-blue-700 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-800">Đồng bộ Google Calendar</h4>
                        {calendarConnected && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                            Đã kết nối
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Tự động tạo sự kiện và báo thức trên Google Calendar của bạn khi đơn đặt sân được xác nhận (múi giờ GMT+7).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={handleToggleCalendar}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      calendarConnected
                        ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {calendarConnected ? 'Ngắt kết nối Calendar' : 'Kết nối Google Calendar'}
                  </button>

                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Nguyên tắc dự án:</strong> Luồng đặt lịch và dữ liệu hoạt động độc lập với Google Calendar & FCM. Nếu dịch vụ ngoài gặp sự cố, đơn đặt sân của bạn vẫn hoàn tất bình thường.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
