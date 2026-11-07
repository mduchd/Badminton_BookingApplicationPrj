import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Star,
  Heart,
  Navigation,
  MessageSquare,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Wifi,
  Car,
  Coffee,
  CheckCircle2,
  Sparkles,
  Info,
  Award,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BadmintonCourtItem } from '../../user/mockData'
import { appStore } from '../../../lib/appStore'

export interface CourtDetailSidebarProps {
  court: BadmintonCourtItem | null
  isOpen: boolean
  onClose: () => void
  onBook?: (court: BadmintonCourtItem) => void
  onOpenAIChat?: () => void
  onOpenOwnerChat?: (court: BadmintonCourtItem) => void
  onToggleFavorite?: (courtId: string) => void
}

type TabKey = 'info' | 'membership' | 'services' | 'images' | 'terms' | 'reviews'

interface TabOption {
  key: TabKey
  label: string
}

const TABS: TabOption[] = [
  { key: 'info', label: 'Thông tin' },
  { key: 'membership', label: 'Gói hội viên' },
  { key: 'services', label: 'Dịch vụ' },
  { key: 'images', label: 'Hình ảnh' },
  { key: 'terms', label: 'Quy định' },
  { key: 'reviews', label: 'Đánh giá' },
]

export const CourtDetailSidebar: React.FC<CourtDetailSidebarProps> = ({
  court,
  isOpen,
  onClose,
  onBook,
  onOpenAIChat,
  onOpenOwnerChat,
  onToggleFavorite,
}) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('info')
  const [isCopied, setIsCopied] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  // Reset tab to info and favorite status whenever court changes
  useEffect(() => {
    if (court) {
      setActiveTab('info')
      setIsFavorite(court.isFavorite ?? false)
    }
  }, [court?.id])

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!court && !isOpen) return null

  // Resolve extended facility info from appStore if available
  const facility = court ? appStore.getFacilityById(court.id) : null
  const galleryImages = facility?.galleryImages || (court ? [court.imageUrl] : [])
  const phone = facility?.phone || '0988 234 567'
  const description =
    facility?.description ||
    `${court?.name || 'Cụm sân'} sở hữu sàn thảm tiêu chuẩn BWF chống trơn trượt, hệ thống chiếu sáng led chống chói hiện đại, khu vực ngồi chờ rộng rãi có máy lạnh và căng tin giải khát.`

  const bookingUrl = court ? `${window.location.origin}/courts/${court.id}` : ''

  const handleCopyLink = () => {
    if (!bookingUrl) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(bookingUrl)
      setIsCopied(true)
      toast.success('Đã sao chép liên kết đặt sân!')
      setTimeout(() => setIsCopied(false), 2500)
    }
  }

  const handleToggleFav = () => {
    if (!court) return
    const next = !isFavorite
    setIsFavorite(next)
    onToggleFavorite?.(court.id)
    toast.success(next ? 'Đã lưu sân vào danh sách yêu thích' : 'Đã bỏ yêu thích')
  }

  const handleOpenGoogleMaps = () => {
    if (!court) return
    window.open(`https://maps.google.com/?q=${encodeURIComponent(court.address)}`, '_blank')
  }

  const handleViewCourtDetails = () => {
    if (!court) return
    onClose()
    navigate(`/courts/${court.id}`)
  }

  const handleBookNow = () => {
    if (!court) return
    onClose()
    if (onBook) {
      onBook(court)
    } else {
      navigate(`/courts/${court.id}/book`)
    }
  }

  const handleStartChat = () => {
    if (onOpenOwnerChat && court) {
      onOpenOwnerChat(court)
    } else if (onOpenAIChat) {
      onClose()
      onOpenAIChat()
    } else {
      toast.info(`Đang kết nối với ban quản lý ${court?.name || 'cụm sân'}...`)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-in Sidebar (Left) */}
      <aside
        aria-label="Chi tiết cụm sân"
        className={`fixed top-0 left-0 bottom-0 z-50 w-full sm:w-[440px] md:w-[480px] bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {court && (
          <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* 1. Header Media / Cover Image */}
            <div className="relative h-48 sm:h-52 w-full flex-shrink-0 bg-slate-900 overflow-hidden group">
              <img
                src={court.imageUrl}
                alt={court.name}
                className="w-full h-full object-cover "
              />

              {/* Top Action Bar over Cover */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
                {/* Back Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white text-slate-800 flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all duration-150 cursor-pointer shadow-xs"
                  title="Quay lại danh sách"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-800 hover:-translate-x-0.5 transition-transform" />
                </button>

                {/* Right Actions: Direction, Favorite, Book CTA */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenGoogleMaps}
                    className="w-9 h-9 rounded-full bg-white text-slate-800 flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all duration-150 cursor-pointer shadow-xs"
                    title="Chỉ đường Google Maps"
                  >
                    <Navigation className="w-4 h-4 text-slate-700" />
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleFav}
                    className="w-9 h-9 rounded-full bg-white text-slate-800 flex items-center justify-center hover:bg-slate-100 active:scale-75 transition-all duration-150 cursor-pointer shadow-xs"
                    title="Yêu thích"
                  >
                    <Heart
                      className={`w-4 h-4 transition-all duration-200 ${
                        isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-700'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handleBookNow}
                    className="px-4 py-2 rounded-xl bg-[#e5a92c] hover:bg-[#d49b24] active:scale-95 text-white font-bold text-xs sm:text-sm cursor-pointer transition-all duration-150"
                  >
                    Đặt lịch
                  </button>
                </div>
              </div>
            </div>

            {/* 2 & 3. Overlapping Venue Info Card (Đè sâu lên background cover tiết kiệm tối đa diện tích) */}
            <div className="relative px-3 sm:px-4 -mt-16 sm:-mt-20 z-20 flex-shrink-0">
              {/* Floating Rating Pill & Chat Button (Nửa trên ảnh bìa, nửa trên mép card) */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10b981] text-white text-xs font-bold shadow-xs ">
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span>
                    {court.rating ? `${court.rating} (${court.reviewCount || 100} đánh giá)` : 'Chưa có đánh giá'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleStartChat}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0f4a2d] hover:bg-[#0c3c24] active:scale-95 text-white text-xs font-bold cursor-pointer shadow-xs transition-all duration-150"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                  <span>Nhắn tin với sân</span>
                </button>
              </div>

              {/* White Card with Venue Details */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-3.5 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 ">
                    <img
                      src={court.logoUrl}
                      alt={court.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {court.name}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {court.sportType === 'pickleball' ? 'Pickleball' : 'Cầu lông'}
                      </span>
                      <span className="text-xs font-bold text-[#ea580c]">
                        Cách bạn {court.distance}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thin divider & info rows */}
                <div className="border-t border-slate-100 pt-2 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#1b7a42] flex-shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-800">{court.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#1b7a42] flex-shrink-0" />
                    <span className="font-medium text-slate-800">
                      Giờ mở cửa: {court.openHours}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#1b7a42] flex-shrink-0" />
                    <a
                      href={`tel:${phone}`}
                      className="font-medium text-[#1b7a42] hover:underline cursor-pointer"
                    >
                      Liên hệ: {phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Tab Navigation */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white px-2 mt-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border-b-2 relative ${
                        isActive
                          ? 'border-[#1b7a42] text-[#1b7a42]'
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 5. Scrollable Tab Content Body with Smooth Entrance Animation */}
            <div key={activeTab} className="flex-1 overflow-y-auto p-4 space-y-4 tab-content-enter">
              {/* TAB 1: THÔNG TIN (INFORMATION) */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* PROMINENT "XEM CHI TIẾT SÂN" BUTTON */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 fade-in-item">
                    <div className="text-xs font-semibold text-slate-700">
                      Trang hồ sơ chính thức của sân:
                    </div>
                    <button
                      type="button"
                      onClick={handleViewCourtDetails}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#1b7a42] hover:bg-[#156335] active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 group"
                    >
                      <span>Xem chi tiết cụm sân</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  </div>

                  {/* Online Booking Link Box */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-1.5 fade-in-item" style={{ '--stagger-delay': '40ms' } as React.CSSProperties}>
                    <div className="text-xs font-bold text-[#ea580c]">
                      Link đặt sân trực tuyến:
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs text-slate-700 font-mono truncate">
                        {bookingUrl}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="p-1.5 text-slate-600 hover:text-[#1b7a42] hover:bg-slate-200/60 rounded-md active:scale-75 cursor-pointer flex-shrink-0 transition-all duration-150"
                        title="Sao chép link"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-600 badge-pop" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pricing Overview */}
                  <div className="border border-slate-200 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-300 transition-colors fade-in-item" style={{ '--stagger-delay': '80ms' } as React.CSSProperties}>
                    <div>
                      <div className="text-xs font-medium text-slate-600">Giá thuê sân tham khảo</div>
                      <div className="text-base sm:text-lg font-black text-[#1b7a42] mt-0.5">
                        {court.pricePerHour.toLocaleString('vi-VN')} đ
                        <span className="text-xs font-semibold text-slate-600"> / giờ</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleBookNow}
                      className="px-4 py-2 rounded-xl bg-[#e5a92c] hover:bg-[#d49b24] active:scale-95 text-white font-bold text-xs cursor-pointer transition-all duration-150"
                    >
                      Chọn giờ chơi
                    </button>
                  </div>

                  {/* Description */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-1.5 fade-in-item" style={{ '--stagger-delay': '120ms' } as React.CSSProperties}>
                    <h3 className="text-xs font-bold text-slate-900">Giới thiệu cụm sân</h3>
                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      {description}
                    </p>
                  </div>

                  {/* Quick Highlights */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 fade-in-item" style={{ '--stagger-delay': '160ms' } as React.CSSProperties}>
                    <h3 className="text-xs font-bold text-slate-900">Điểm nổi bật</h3>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1b7a42] flex-shrink-0" />
                        <span>Thảm thi đấu chuyên dụng tiêu chuẩn BWF, độ bám cao</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1b7a42] flex-shrink-0" />
                        <span>Hệ thống đèn LED chiếu sáng vát góc, không gây chói mắt</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1b7a42] flex-shrink-0" />
                        <span>Bãi đỗ xe ô tô và xe máy rộng rãi, bảo vệ trông giữ 24/7</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1b7a42] flex-shrink-0" />
                        <span>Khu ngồi nghỉ điều hòa mát lạnh, căng tin nước uống đầy đủ</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: GÓI HỘI VIÊN (MEMBERSHIP PACKAGE) */}
              {activeTab === 'membership' && (
                <div className="space-y-3.5">
                  <div className="text-center py-4 px-2 bg-slate-50 border border-slate-200 rounded-xl space-y-2 fade-in-item">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#1b7a42] flex items-center justify-center mx-auto ">
                      <Award className="w-5 h-5 text-[#1b7a42]" />
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      Chính sách ưu đãi hội viên SmashCourt
                    </div>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto">
                      Đăng ký gói cố định tuần hoặc thẻ tháng để tiết kiệm chi phí và giữ lịch chơi ổn định.
                    </p>
                  </div>

                  {/* Plan 1 */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 hover:border-emerald-400 hover:-translate-y-0.5 transition-all duration-200 fade-in-item" style={{ '--stagger-delay': '50ms' } as React.CSSProperties}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-900">Gói cố định theo tháng</div>
                      <span className="text-[11px] font-bold text-[#1b7a42] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Tiết kiệm 15%
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      Cố định khung giờ chơi 2 - 3 buổi mỗi tuần (Thứ 2-4-6 hoặc 3-5-7). Không lo bị mất sân giờ cao điểm.
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="font-bold text-slate-900">Từ 1.200.000 đ / tháng</span>
                      <button
                        type="button"
                        onClick={handleStartChat}
                        className="text-[#1b7a42] hover:underline font-bold cursor-pointer"
                      >
                        Đăng ký ngay →
                      </button>
                    </div>
                  </div>

                  {/* Plan 2 */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 hover:border-emerald-400 hover:-translate-y-0.5 transition-all duration-200 fade-in-item" style={{ '--stagger-delay': '100ms' } as React.CSSProperties}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-900">Thẻ linh hoạt 10 buổi</div>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Giảm 10%
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      Tự do đặt lịch các buổi chơi trong vòng 60 ngày. Phù hợp cho nhóm bạn chơi lịch không cố định.
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="font-bold text-slate-900">1.080.000 đ / 10 buổi</span>
                      <button
                        type="button"
                        onClick={handleStartChat}
                        className="text-[#1b7a42] hover:underline font-bold cursor-pointer"
                      >
                        Đăng ký ngay →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DỊCH VỤ (SERVICES & AMENITIES) */}
              {activeTab === 'services' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-900 mb-1 fade-in-item">
                    Tiện ích & dịch vụ tại cụm sân
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { icon: Wifi, title: 'Wifi cáp quang miễn phí' },
                      { icon: Car, title: 'Bãi xe ô tô & xe máy' },
                      { icon: Coffee, title: 'Căng tin nước & giải khát' },
                      { icon: ShieldCheck, title: 'Thuê vợt & bán cầu BWF' },
                      { icon: Sparkles, title: 'Phòng tắm & thay đồ sạch' },
                      { icon: Award, title: 'HLV kèm cặp cơ bản/nâng cao' },
                    ].map((item, idx) => {
                      const IconComp = item.icon
                      return (
                        <div
                          key={idx}
                          style={{ '--stagger-delay': `${idx * 40}ms` } as React.CSSProperties}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 fade-in-item"
                        >
                          <IconComp className="w-4 h-4 text-[#1b7a42] flex-shrink-0" />
                          <div className="text-xs font-medium text-slate-800">{item.title}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: HÌNH ẢNH (IMAGES) */}
              {activeTab === 'images' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-900 fade-in-item">
                    Bộ sưu tập ảnh sân ({galleryImages.length} ảnh)
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {galleryImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        style={{ '--stagger-delay': `${idx * 50}ms` } as React.CSSProperties}
                        className="relative h-28 sm:h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group fade-in-item"
                      >
                        <img
                          src={imgUrl}
                          alt={`${court.name} - ảnh ${idx + 1}`}
                          className="w-full h-full object-cover "
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: QUY ĐỊNH (TERMS & CONDITIONS) */}
              {activeTab === 'terms' && (
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 hover:border-slate-300 transition-colors fade-in-item">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#1b7a42]" />
                      <span>Quy định trang phục & giày</span>
                    </h4>
                    <p className="leading-relaxed">
                      Người chơi bắt buộc phải đi giày thể thao đế kếp (non-marking) hoặc giày cầu lông chuyên dụng. Không sử dụng giày đinh, giày đế đen để lại vết trầy trên mặt thảm.
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 hover:border-slate-300 transition-colors fade-in-item" style={{ '--stagger-delay': '50ms' } as React.CSSProperties}>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#1b7a42]" />
                      <span>Chính sách nhận sân & giờ chơi</span>
                    </h4>
                    <p className="leading-relaxed">
                      Vui lòng có mặt trước giờ chơi 10 phút để nhận sân. Trận đấu bắt đầu và kết thúc đúng theo khung giờ đã đặt trên hệ thống SmashCourt.
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 hover:border-slate-300 transition-colors fade-in-item" style={{ '--stagger-delay': '100ms' } as React.CSSProperties}>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#1b7a42]" />
                      <span>Chính sách đổi trả & hoàn tiền</span>
                    </h4>
                    <p className="leading-relaxed">
                      Hủy đặt sân trước 24 giờ: Hoàn tiền 100% về ví SmashCourt. Hủy trước 6 giờ: Hỗ trợ dời lịch sang giờ chơi khác cùng mức giá.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 6: ĐÁNH GIÁ (REVIEWS) */}
              {activeTab === 'reviews' && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50 fade-in-item">
                    <div className="text-3xl font-black text-slate-900">
                      {court.rating || 4.8}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(court.rating || 4.8)
                                ? 'fill-[#e5a92c] text-[#e5a92c]'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-slate-600 font-medium mt-0.5">
                        Dựa trên {court.reviewCount || 100} lượt đánh giá
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">Chưa có nội dung đánh giá.</p>
                </div>
              )}
            </div>

            {/* 6. Bottom Sticky CTA Footer */}
            <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div>
                <span className="text-[11px] text-slate-600 block">Giá chỉ từ:</span>
                <span className="text-sm sm:text-base font-bold text-[#1b7a42]">
                  {court.pricePerHour.toLocaleString('vi-VN')} đ/h
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewCourtDetails}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-800 text-xs font-bold transition-all duration-150 cursor-pointer"
                >
                  Xem chi tiết
                </button>
                <button
                  type="button"
                  onClick={handleBookNow}
                  className="px-4 py-2 rounded-xl bg-[#1b7a42] hover:bg-[#156335] active:scale-95 text-white text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer"
                >
                  Đặt sân ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
