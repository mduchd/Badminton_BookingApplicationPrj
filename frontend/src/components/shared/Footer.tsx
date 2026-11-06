import React from 'react'
import { ShieldCheck, Mail, Phone, MapPin } from 'lucide-react'
import { AppLogo } from './AppLogo'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 text-xs border-t border-slate-800 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-1">
            <AppLogo size="sm" variant="light" />
            <p className="text-slate-300 text-xs leading-relaxed font-normal">
              Nền tảng đặt sân cầu lông trực tuyến thông minh theo thời gian thực. Giữ chỗ tức thì, chống trùng lịch và quản lý toàn diện cho khách hàng và chủ sân.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Nền tảng vận hành thể thao chuyên nghiệp</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 text-xs">Dành cho Khách hàng</h4>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li>• Tìm kiếm sân trống gần bạn</li>
              <li>• Đặt lịch nhanh theo khung giờ</li>
              <li>• Đồng bộ lịch cá nhân Google Calendar</li>
              <li>• Tham gia giao lưu & ghép trận phong trào</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 text-xs">Dành cho Chủ sân</h4>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li>• Quản lý lịch sân & bảng giá linh hoạt</li>
              <li>• Check-in khách nhanh chóng tại quầy</li>
              <li>• Thống kê doanh thu & tỷ lệ lấp đầy</li>
              <li>• Lập lịch khóa sân & bảo dưỡng thiết bị</li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 text-xs">Hỗ trợ & Liên hệ</h4>
            <ul className="space-y-2 text-[11px] text-slate-300">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Hà Nội & TP. Hồ Chí Minh, Việt Nam</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>hotro@smashcourt.vn</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>1900 6868 (08:00 - 22:00)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p className="text-slate-400">© 2026 SmashCourt. Nền tảng đặt sân cầu lông trực tuyến hàng đầu.</p>
          <p className="text-slate-400 font-medium">
            Thiết kế giao diện phẳng hiện đại, tương thích đa nền tảng
          </p>
        </div>
      </div>
    </footer>
  )
}
