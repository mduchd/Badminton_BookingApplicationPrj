import React from 'react'
import { ShieldCheck, Mail, Phone, MapPin, Sparkles } from 'lucide-react'
import { AppLogo } from './AppLogo'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-1">
            <AppLogo size="sm" variant="light" />
            <p className="text-slate-400 text-xs leading-relaxed">
              Hệ thống đặt sân cầu lông trực tuyến thông minh theo thời gian thực. Tích hợp Smart Filter, AI Court Finder và quản lý toàn diện cho khách hàng & chủ sân.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Dự án Modular Monolith - Nhóm 3 người</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Phân công Module</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li className="text-emerald-400 font-semibold">• TV1: User, Auth, Smart Search & AI Notification</li>
              <li>• TV2: Court Management, Facility & Maps</li>
              <li>• TV3: Booking Engine, Anti-overlap & payOS</li>
              <li>• Hệ thống: SmashCourt Badminton Booking</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Dịch vụ tích hợp</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>• Spring AI + LLM API (Structured Output)</li>
              <li>• Google OIDC & Google Calendar API</li>
              <li>• payOS Payment Gateway / Mock</li>
              <li>• Brevo Email API + FCM Web Push</li>
              <li>• Spring WebSocket STOMP + Sonner Toast</li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Hỗ trợ & Liên hệ</h4>
            <ul className="space-y-2 text-[11px]">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Hà Nội & TP. Hồ Chí Minh, Việt Nam</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>support@badmintonbooking.vn</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>1900 6868 (8:00 - 22:00)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© 2026 Badminton Booking System. Đồ án xây dựng theo chuẩn tài liệu triển khai V3.0.</p>
          <p className="flex items-center gap-1 text-slate-500">
            <span>Thiết kế giao diện TV1</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>React 19 + Tailwind CSS + Sonner</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
