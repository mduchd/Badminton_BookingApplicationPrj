import { useState, useEffect } from 'react'
import { X, Mail, Lock, User as UserIcon, Phone, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { User, UserRole } from '../../types/user'
import { toast } from 'sonner'
import { AppLogo } from '../../../components/shared/AppLogo'
import { authApi } from './authApi'
import { GoogleSignInButton } from './GoogleSignInButton'

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

  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('CUSTOMER')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleStandardAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (activeTab === 'login') {
        const authData = loginMethod === 'phone'
          ? await authApi.loginByPhone({ phone, password })
          : await authApi.login({ email, password })
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
        toast.error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async (credential: string) => {
    setLoading(true)
    try {
      const result = await authApi.googleLogin(credential)
      onLoginSuccess(result.user)
      toast.success('Đăng nhập Google thành công!')
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Đăng nhập Google thất bại')
    } finally {
      setLoading(false)
    }
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
              {activeTab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </h2>
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
          <GoogleSignInButton onCredential={handleGoogleAuth} disabled={loading} />

          {/* Divider */}
          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-500 absolute">
              Hoặc
            </span>
          </div>

          {activeTab === 'login' && (
            <div className="flex border-b border-slate-200" role="tablist" aria-label="Phương thức đăng nhập">
              <button type="button" role="tab" aria-selected={loginMethod === 'phone'} onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2 text-sm font-semibold cursor-pointer border-b-2 ${loginMethod === 'phone' ? 'text-[#1b7a42] border-[#1b7a42]' : 'text-slate-600 border-transparent hover:text-slate-900'}`}>
                Số điện thoại
              </button>
              <button type="button" role="tab" aria-selected={loginMethod === 'email'} onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 text-sm font-semibold cursor-pointer border-b-2 ${loginMethod === 'email' ? 'text-[#1b7a42] border-[#1b7a42]' : 'text-slate-600 border-transparent hover:text-slate-900'}`}>
                Email
              </button>
            </div>
          )}

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
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#1b7a42] focus:ring-1 focus:ring-[#1b7a42] transition-colors"
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
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#1b7a42] focus:ring-1 focus:ring-[#1b7a42] transition-colors"
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
                      Chủ sân
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'login' && loginMethod === 'phone' ? (
              <div>
                <label htmlFor="login-phone" className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input id="login-phone" type="tel" required autoComplete="tel" value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#1b7a42] focus:ring-1 focus:ring-[#1b7a42]" />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input id="auth-email" type="email" required autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#1b7a42] focus:ring-1 focus:ring-[#1b7a42]" />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="text-xs font-semibold text-slate-700">Mật khẩu</label>
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
                  id="auth-password"
                  type="password"
                  autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#1b7a42] focus:ring-1 focus:ring-[#1b7a42] transition-colors"
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
                  Đăng ký
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
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
