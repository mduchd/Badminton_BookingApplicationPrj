import { useState, useEffect } from 'react'
import { X, Mail, Lock, User as UserIcon, Phone, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'
import type { User, UserRole } from '../../types/user'
import { toast } from 'sonner'
import { AppLogo } from '../../../components/shared/AppLogo'

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

  // Sync tab when initialTab changes
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])
  const [email, setEmail] = useState('minhtri.dev@gmail.com')
  const [password, setPassword] = useState('••••••••')
  const [fullName, setFullName] = useState('Nguyễn Minh Trí')
  const [phone, setPhone] = useState('0988 123 456')
  const [role, setRole] = useState<UserRole>('CUSTOMER')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleStandardAuth = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      const mockUser: User = {
        id: 'usr_' + Date.now().toString().slice(-4),
        email,
        fullName: activeTab === 'login' ? (email.includes('owner') ? 'Trần Văn Chủ Sân' : 'Nguyễn Minh Trí') : fullName,
        role: email.includes('owner') ? 'COURT_OWNER' : role,
        provider: 'LOCAL',
        phone,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        fcmEnabled: true,
        calendarConnected: false,
      }
      onLoginSuccess(mockUser)
      toast.success(
        activeTab === 'login'
          ? `Đăng nhập thành công! Chào mừng ${mockUser.fullName}`
          : `Đăng ký tài khoản thành công! Chào mừng bạn gia nhập hệ thống.`
      )
      onClose()
    }, 600)
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
      toast.success('Đăng nhập Google OpenID Connect thành công!')
      onClose()
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header (Solid Flat Color) */}
        <div className="p-6 pb-4 bg-[#1b7a42] text-white">
          <AppLogo size="sm" variant="light" className="mb-3" />
          <h2 className="text-xl font-bold">
            {activeTab === 'login' ? 'Đăng nhập vào tài khoản' : 'Tạo tài khoản mới'}
          </h2>
          <p className="text-emerald-100 text-xs mt-1">
            Đặt sân nhanh chóng, nhận thông báo tức thời và tra cứu lịch sân dễ dàng.
          </p>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-white/15 rounded-xl mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'register' ? 'bg-white text-slate-800 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              Đăng ký
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors font-medium text-slate-700 text-sm hover:border-slate-300 cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
              Hoặc với email
            </span>
          </div>

          <form onSubmit={handleStandardAuth} className="space-y-3">
            {activeTab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vai trò tài khoản</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('CUSTOMER')}
                      className={`p-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        role === 'CUSTOMER'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${role === 'CUSTOMER' ? 'text-emerald-600' : 'text-transparent'}`} />
                      Khách đặt sân
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('COURT_OWNER')}
                      className={`p-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        role === 'COURT_OWNER'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${role === 'COURT_OWNER' ? 'text-emerald-600' : 'text-transparent'}`} />
                      Chủ sân (Owner)
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Mật khẩu</label>
                {activeTab === 'login' && (
                  <button
                    type="button"
                    onClick={() => toast.info('Chức năng cấp lại mật khẩu qua Brevo Email')}
                    className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
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

          <div className="pt-2 flex items-center justify-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1b7a42]" />
            <span>Bảo mật thông tin tài khoản an toàn</span>
          </div>
        </div>
      </div>
    </div>
  )
}
