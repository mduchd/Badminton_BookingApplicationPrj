import { useState, useEffect } from 'react'
import { X, Mail, Lock, User as UserIcon, Phone, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'
import type { User, UserRole } from '../../types/user'
import { toast } from 'sonner'
import { AppLogo } from '../../../components/shared/AppLogo'
import { authApi } from './authApi'

interface AuthModalProps {
  isOpen: boolean
  initialTab?: 'login' | 'register'
  onClose: () => void
  onLoginSuccess: (user: User) => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab)
  const [tabSlideDir, setTabSlideDir] = useState<'right' | 'left'>('right')

  // Sync tab when initialTab changes
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const switchTab = (tab: 'login' | 'register') => {
    if (tab === activeTab) return
    setTabSlideDir(tab === 'register' ? 'right' : 'left')
    setActiveTab(tab)
  }

  const [email, setEmail] = useState('minhtri.dev@gmail.com')
  const [password, setPassword] = useState('123456')
  const [fullName, setFullName] = useState('Nguyễn Minh Trí')
  const [phone, setPhone] = useState('0988 123 456')
  const [role, setRole] = useState<UserRole>('CUSTOMER')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleStandardAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (activeTab === 'login') {
        const authData = await authApi.login({ email, password })
        toast.success(`Đăng nhập thành công! Chào mừng ${authData.user.fullName}`)
        onLoginSuccess(authData.user)
        onClose()
      } else {
        const authData = await authApi.register({ email, password, fullName, phone, role })
        toast.success('Đăng ký tài khoản thành công! Chào mừng bạn gia nhập hệ thống.')
        onLoginSuccess(authData.user)
        onClose()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi xác thực'
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        toast.error('Không thể kết nối đến Backend (port 8080). Vui lòng đảm bảo server Spring Boot đang chạy!')
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const googleUser: User = {
        id: 'usr_google_091',
        email: 'minhtri.dev@gmail.com',
        fullName: 'Nguyễn Minh Trí (Google)',
        role: 'CUSTOMER',
        provider: 'GOOGLE',
        phone: '0988 123 456',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        fcmEnabled: true,
        calendarConnected: true,
        calendarEmail: 'minhtri.dev@gmail.com',
      }
      onLoginSuccess(googleUser)
      toast.success('Đăng nhập Google thành công!')
      onClose()
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overlay-enter">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-[420px] max-h-[min(92vh,680px)] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10 modal-enter">
        {/* Header - Clean, modern and compact */}
        <div className="p-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <AppLogo size="sm" variant="dark" />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {activeTab === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'login'
                ? 'Đăng nhập để đặt sân nhanh chóng và quản lý lịch chơi'
                : 'Điền thông tin để trải nghiệm đặt sân cầu lông chuyên nghiệp'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl mt-3.5">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng ký
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div
          key={activeTab}
          className={`flex-1 overflow-y-auto px-5 py-4 space-y-4 ${
            tabSlideDir === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
          }`}
        >
          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors font-medium text-slate-700 text-sm cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Tiếp tục với Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-600 absolute">
              Hoặc với email
            </span>
          </div>

          <form onSubmit={handleStandardAuth} className="space-y-3">
            {activeTab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#1b7a42] focus:ring-1 focus:ring-[#1b7a42] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#1b7a42] focus:ring-1 focus:ring-[#1b7a42] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vai trò tài khoản
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('CUSTOMER')}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        role === 'CUSTOMER'
                          ? 'border-[#1b7a42] bg-emerald-50 text-[#1b7a42] font-semibold ring-1 ring-[#1b7a42]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          role === 'CUSTOMER' ? 'text-[#1b7a42]' : 'text-slate-300'
                        }`}
                      />
                      Khách đặt sân
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('COURT_OWNER')}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        role === 'COURT_OWNER'
                          ? 'border-[#1b7a42] bg-emerald-50 text-[#1b7a42] font-semibold ring-1 ring-[#1b7a42]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          role === 'COURT_OWNER' ? 'text-[#1b7a42]' : 'text-slate-300'
                        }`}
                      />
                      Chủ sân (Owner)
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#1b7a42] focus:ring-1 focus:ring-[#1b7a42] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Mật khẩu</label>
                {activeTab === 'login' && (
                  <button
                    type="button"
                    onClick={() => toast.info('Chức năng cấp lại mật khẩu qua email')}
                    className="text-xs text-[#1b7a42] hover:text-[#168039] hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#1b7a42] focus:ring-1 focus:ring-[#1b7a42] transition-colors"
                />
              </div>
            </div>

            {/* Flat CTA button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#1b7a42] hover:bg-[#168039] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>{activeTab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick tab switch text link */}
          <div className="text-center text-xs text-slate-500 pt-1">
            {activeTab === 'login' ? (
              <>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  className="font-semibold text-[#1b7a42] hover:underline cursor-pointer"
                >
                  Đăng ký ngay
                </button>
              </>
            ) : (
              <>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="font-semibold text-[#1b7a42] hover:underline cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              </>
            )}
          </div>

          {/* Security note */}
          <div className="pt-2 pb-1 flex items-center justify-center gap-1.5 text-slate-600 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-[#1b7a42]" />
            <span>Bảo mật thông tin tài khoản an toàn</span>
          </div>
        </div>
      </div>
    </div>
  )
}
