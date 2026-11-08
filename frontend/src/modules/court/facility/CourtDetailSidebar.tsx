import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Star,
  Heart,
  Route,
  MessageSquare,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info,
  Award,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BadmintonCourtItem } from '../../types/court'
import { useQuery } from '@tanstack/react-query'
import { courtApi } from '../services/courtApi'

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
  { key: 'terms', label: 'Điều khoản & quy định' },
  { key: 'reviews', label: 'Đánh giá' },
]

interface ParsedContact {
  telHref: string
  phoneDisplay: string
  note?: string
}

function parseContacts(rawPhone: string): ParsedContact[] {
  const segments = rawPhone
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)

  return segments.map((seg) => {
    const dashIdx = seg.indexOf(' - ')
    if (dashIdx !== -1) {
      const numPart = seg.slice(0, dashIdx).trim()
      const notePart = seg.slice(dashIdx + 3).trim()
      const digits = numPart.replace(/[^\d+]/g, '')
      return {
        telHref: digits,
        phoneDisplay: numPart,
        note: notePart,
      }
    }
    const digits = seg.replace(/[^\d+]/g, '')
    return {
      telHref: digits,
      phoneDisplay: seg,
    }
  }).filter((contact) => contact.telHref.length > 0)
}

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`
}

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
  const isFavorite = court?.isFavorite ?? false
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)

  useEffect(() => {
    if (court) {
      setActiveTab('info')
      setLightboxImg(null)
    }
  }, [court?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImg) {
          setLightboxImg(null)
        } else if (isOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, lightboxImg, onClose])

  const { data, isPending, isError } = useQuery({
    queryKey: ['facilityDetail', court?.id],
    queryFn: () => courtApi.getFacilityDetail(court!.id),
    enabled: isOpen && Boolean(court),
    retry: false,
  })

  if (!court && !isOpen) return null

  const facility = data?.facility
  const priceRules = data?.priceRules ?? []
  const monthlyPrices = priceRules.filter((rule) => rule.customerType === 'FIXED_MONTHLY')
  const galleryImages = facility?.galleryImages ?? court?.galleryImages ?? (court?.imageUrl ? [court.imageUrl] : [])
  const contacts = parseContacts(facility?.phone || court?.phone || '')
  const displayOpenHours = (facility?.openHours || court?.openHours || 'Chưa cập nhật').replace('23:59', '24:00')
  const addressLines = (facility?.address || court?.address || '').split('|').map((line) => line.trim()).filter(Boolean)
  const reviewCount = court?.reviewCount ?? facility?.reviewCount ?? 0
  const ratingValue = court?.rating ?? facility?.rating ?? 0
  const description = facility?.description || 'Chưa có mô tả cụm sân.'

  const bookingUrl = court ? `${window.location.origin}/courts/${court.id}` : ''

  const handleCopyLink = () => {
    if (!bookingUrl) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(bookingUrl)
      setIsCopied(true)
      toast.success('Đã sao chép liên kết đặt lịch online!')
      setTimeout(() => setIsCopied(false), 2500)
    }
  }

  const handleToggleFav = () => {
    if (!court) return
    onToggleFavorite?.(court.id)
  }

  const handleOpenGoogleMaps = () => {
    if (!court) return
    const targetAddr = addressLines[0] || court.address
    window.open(`https://maps.google.com/?q=${encodeURIComponent(targetAddr)}`, '_blank')
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
    if (court && onOpenOwnerChat) {
      onClose()
      onOpenOwnerChat(court)
    } else if (onOpenAIChat) {
      onClose()
      onOpenAIChat()
    } else {
      toast.info(`Đang mở kênh chat với ${court?.name || 'cụm sân'}...`)
    }
  }

  const sampleReviews = [
    {
      author: 'Anh Minh (CLB Cầu Lông Phong Trào)',
      time: '3 ngày trước',
      content: 'Thảm sân mới, độ bám chân tốt, đèn bố trí chuẩn không bị chói mắt khi lốp cầu cao.',
    },
    {
      author: 'Hoàng Trang',
      time: '1 tuần trước',
      content: 'Sân thoáng mát, chỗ để xe rộng rãi và chủ sân hỗ trợ nhận sân rất nhiệt tình.',
    },
    {
      author: 'Quốc Bảo',
      time: '2 tuần trước',
      content: 'Đặt lịch online nhanh gọn, khu vực ghế ngồi chờ sạch sẽ, có quầy nước đầy đủ.',
    },
  ]

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
        className={`fixed top-0 left-0 bottom-0 z-50 w-full sm:w-[460px] md:w-[500px] bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {court && (
          <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* 1. Top Cover Image */}
            <div className="relative h-48 sm:h-52 w-full flex-shrink-0 bg-slate-900 overflow-hidden">
              <img
                src={court.imageUrl}
                alt={court.name}
                className="w-full h-full object-cover"
              />

              {/* Top Action Bar over Cover */}
              <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white text-[#0c4a2b] flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all duration-150 cursor-pointer shadow-xs focus:outline-none"
                  title="Quay lại danh sách"
                >
                  <ArrowLeft className="w-5 h-5 text-[#0c4a2b]" />
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenGoogleMaps}
                    className="w-10 h-10 rounded-full bg-white text-[#0c4a2b] flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all duration-150 cursor-pointer shadow-xs focus:outline-none"
                    title="Chỉ đường Google Maps"
                  >
                    <Route className="w-5 h-5 text-[#0c4a2b]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleFav}
                    className="w-10 h-10 rounded-full bg-white text-[#0c4a2b] flex items-center justify-center hover:bg-slate-100 active:scale-75 transition-all duration-150 cursor-pointer shadow-xs focus:outline-none"
                    title="Yêu thích"
                  >
                    <Heart
                      className={`w-5 h-5 transition-all duration-200 ${
                        isFavorite ? 'fill-rose-500 text-rose-500' : 'text-[#0c4a2b]'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handleBookNow}
                    className="px-5 py-2.5 rounded-xl bg-[#dfb03b] hover:bg-[#cfa02d] active:scale-95 text-white font-semibold text-sm cursor-pointer transition-all duration-150 focus:outline-none"
                  >
                    Đặt lịch
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Overlapping Venue Info Card with Centered Floating Pills */}
            <div className="relative px-3.5 sm:px-4 -mt-14 z-20 flex-shrink-0">
              {/* Centered Floating Rating & Chat Pills Straddling Card Top Border */}
              <div className="relative z-10 flex items-center justify-center gap-2.5 -mb-5 px-2">
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#22b573] text-white text-sm font-semibold shadow-xs">
                  <Star className="w-4 h-4 fill-white text-white" />
                  <span>
                    {reviewCount > 0 ? `${ratingValue} (${reviewCount} đánh giá)` : 'Chưa có đánh giá'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleStartChat}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#066839] hover:bg-[#05562f] active:scale-95 text-white text-sm font-semibold cursor-pointer shadow-xs transition-all duration-150 focus:outline-none"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>Chat với sân</span>
                </button>
              </div>

              {/* White Venue Card */}
              <div className="bg-white rounded-2xl border border-[#e4ece8] shadow-sm pt-7 pb-3.5 px-4 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full border border-slate-200 overflow-hidden flex-shrink-0 bg-[#0d0f12]">
                    <img
                      src={court.logoUrl}
                      alt={court.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] sm:text-base font-semibold text-[#0c4a2b] leading-snug">
                      {court.name}
                    </h2>
                    <div className="mt-1.5 flex items-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f3fcf8] text-[#16b877] border border-[#16b877]">
                        <MapPin className="w-3 h-3 text-[#16b877]" />
                        <span>Cầu lông</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thin divider & synchronized info rows */}
                <div className="border-t border-[#e8efec] pt-2.5 space-y-2 text-[13px] text-[#134e32]">
                  {/* Address Row */}
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#066839] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-3 h-3 text-white" />
                    </span>
                    <div className="space-y-1 flex-1 min-w-0">
                      {addressLines.map((line, idx) => (
                        <div key={idx} className="leading-snug text-[#134e32]">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Open Hours Row */}
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#066839] text-white flex items-center justify-center flex-shrink-0">
                      <Clock className="w-3 h-3 text-white" />
                    </span>
                    <span className="text-[#134e32]">{displayOpenHours}</span>
                  </div>

                  {/* Contact Rows */}
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-5 h-5 text-[#066839] fill-[#066839] flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1 min-w-0">
                      {contacts.length === 0 && <span>Chưa cập nhật số điện thoại</span>}
                      {contacts.map((c, idx) => (
                        <div key={idx} className="leading-snug">
                          {c.note ? (
                            <>
                              <a
                                href={`tel:${c.telHref}`}
                                className="text-[#16b877] hover:underline font-medium cursor-pointer"
                              >
                                {c.phoneDisplay}
                              </a>
                              <span className="text-[#134e32]"> - {c.note}</span>
                            </>
                          ) : (
                            <a
                              href={`tel:${c.telHref}`}
                              title={`Gọi ${c.phoneDisplay}`}
                              className="text-[#16b877] hover:underline font-medium cursor-pointer inline-block"
                            >
                              Liên hệ
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Tab Navigation Bar */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white px-2 mt-2">
              <div className="grid grid-cols-6 items-end">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-1 py-2.5 text-xs sm:text-[13px] leading-tight text-center transition-colors duration-150 cursor-pointer border-b-2 focus:outline-none ${
                        isActive
                          ? 'border-[#16b877] text-[#16b877] font-semibold'
                          : 'border-transparent text-[#134e32] hover:text-[#16b877] font-medium'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 4. Scrollable Tab Body */}
            <div key={activeTab} className="flex-1 overflow-y-auto p-4 space-y-4 tab-content-enter">
              {/* TAB 1: THÔNG TIN */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Online Booking Link Row */}
                  <div className="border border-[#e4ece8] rounded-2xl p-3.5 space-y-1.5 bg-white">
                    <div className="text-[13px] font-bold text-[#d95b16]">
                      Link đặt lịch online
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={bookingUrl}
                        onClick={(e) => {
                          e.preventDefault()
                          handleViewCourtDetails()
                        }}
                        className="text-xs sm:text-[13px] text-[#0c6b3d] italic hover:underline break-all"
                      >
                        {bookingUrl}
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-8 h-8 rounded-lg bg-[#e9f5ef] text-[#0c6b3d] hover:bg-[#d8eee3] flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors focus:outline-none"
                        title="Sao chép link đặt lịch"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-[#16b877]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="border border-[#e4ece8] rounded-2xl p-3.5 space-y-2 bg-white">
                    <h3 className="text-[13px] font-bold text-[#0c4a2b]">Giới thiệu cụm sân</h3>
                    <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                      {description}
                    </p>
                  </div>

                  {/* Amenities & Quick Highlights */}
                  <div className="border border-[#e4ece8] rounded-2xl p-3.5 space-y-2.5 bg-white">
                    <h3 className="text-[13px] font-bold text-[#0c4a2b]">Tiện ích tại sân</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                      {(facility?.amenities ?? court.amenities).map((am, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16b877] flex-shrink-0" />
                          <span>{am}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Full Facility Detail Page Button */}
                  <button
                    type="button"
                    onClick={handleViewCourtDetails}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#066839] hover:bg-[#05562f] active:scale-[0.99] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors focus:outline-none"
                  >
                    <span>Xem trang chi tiết cụm sân</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* TAB 2: GÓI HỘI VIÊN */}
              {activeTab === 'membership' && (
                <div className="space-y-3.5">
                  <div className="text-center py-4 px-3 bg-[#f7fbf9] border border-[#e4ece8] rounded-2xl space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#e6f7ef] text-[#066839] flex items-center justify-center mx-auto">
                      <Award className="w-5 h-5 text-[#066839]" />
                    </div>
                    <div className="text-xs sm:text-[13px] font-bold text-[#0c4a2b]">
                      Gói hội viên & Lịch cố định tháng
                    </div>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto">
                      Đăng ký lịch cố định theo tuần/tháng để nhận mức giá ưu đãi và giữ sân khung giờ vàng.
                    </p>
                  </div>

                  <div className="border border-[#e4ece8] rounded-2xl p-3.5 space-y-2 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-xs sm:text-[13px] font-bold text-[#0c4a2b]">
                        Gói cố định theo tháng
                      </div>
                      <span className="text-[11px] font-semibold text-[#066839] bg-[#f3fcf8] px-2.5 py-0.5 rounded-full border border-[#16b877]">
                        Giá cố định ưu đãi
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="font-bold text-[#0c4a2b]">
                        {monthlyPrices.length > 0
                          ? `Từ ${formatVnd(Math.min(...monthlyPrices.map((rule) => rule.pricePerHour)))} / giờ`
                          : 'Chưa có bảng giá cố định'}
                      </span>
                      <button
                        type="button"
                        onClick={handleStartChat}
                        className="text-[#16b877] hover:underline font-semibold cursor-pointer focus:outline-none"
                      >
                        Liên hệ đăng ký →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DỊCH VỤ (BẢNG GIÁ SÂN + DỊCH VỤ) */}
              {activeTab === 'services' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-[#0c4a2b] uppercase tracking-wide">
                      BẢNG GIÁ SÂN
                    </h3>
                    <div className="text-center text-[13px] font-semibold text-[#0c4a2b]">
                      Cầu Lông
                    </div>

                    {priceRules.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-[#9ab7a8]">
                        <table className="w-full text-left text-xs text-[#0c4a2b]">
                          <thead>
                            <tr className="border-b border-[#9ab7a8]">
                              <th className="p-2">Bảng giá</th>
                              <th className="p-2">Khung giờ</th>
                              <th className="p-2">Đơn giá/giờ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {priceRules.map((rule) => (
                              <tr key={rule.id} className="border-b border-[#e4ece8]">
                                <td className="p-2">{rule.name} · {rule.courtName}</td>
                                <td className="p-2">{rule.startTime} – {rule.endTime}</td>
                                <td className="p-2">{formatVnd(rule.pricePerHour)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p role="status" className="text-sm text-slate-600">
                        {isPending ? 'Đang tải bảng giá…' : isError ? 'Không thể tải bảng giá.' : 'Cụm sân chưa công bố bảng giá theo khung giờ.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: HÌNH ẢNH (3-COLUMN SQUARE GRID MATCHING REFERENCE) */}
              {activeTab === 'images' && (
                <div className="grid grid-cols-3 gap-2.5">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxImg(imgUrl)}
                      className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 cursor-pointer focus:outline-none"
                    >
                      <img
                        src={imgUrl}
                        alt={`${court.name} - ảnh ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* TAB 5: ĐIỀU KHOẢN & QUY ĐỊNH */}
              {activeTab === 'terms' && (
                <div className="space-y-3 text-xs sm:text-[13px] text-slate-700">
                  <div className="border border-[#e4ece8] rounded-2xl p-3.5 space-y-1.5">
                    <h4 className="font-bold text-[#0c4a2b] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#066839]" />
                      <span>Quy định giày & mặt sân</span>
                    </h4>
                    <p className="leading-relaxed">
                      Vui lòng mang giày cầu lông chuyên dụng hoặc giày thể thao đế kếp không để lại vệt đen trên mặt thảm PVC.
                    </p>
                  </div>

                  <div className="border border-[#e4ece8] rounded-2xl p-3.5 space-y-1.5">
                    <h4 className="font-bold text-[#0c4a2b] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#066839]" />
                      <span>Nhận sân & thời gian thi đấu</span>
                    </h4>
                    <p className="leading-relaxed">
                      Có mặt trước giờ đặt 5 - 10 phút để nhận sân. Vui lòng bàn giao sân đúng giờ khi kết thúc ca đặt lịch.
                    </p>
                  </div>

                  <div className="border border-[#e4ece8] rounded-2xl p-3.5 space-y-1.5">
                    <h4 className="font-bold text-[#0c4a2b] flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#066839]" />
                      <span>Đổi lịch & hủy đặt sân</span>
                    </h4>
                    <p className="leading-relaxed">
                      Hỗ trợ đổi khung giờ hoặc bảo lưu lịch đặt khi thông báo trước tối thiểu 6 giờ qua hotline hoặc mục Chat với sân.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 6: ĐÁNH GIÁ */}
              {activeTab === 'reviews' && (
                <div className="space-y-3.5">
                  {reviewCount === 0 ? (
                    <div className="text-center py-8 px-4 border border-[#e4ece8] rounded-2xl bg-[#f8fbf9] space-y-2">
                      <Star className="w-8 h-8 text-[#84a98c] mx-auto" />
                      <div className="text-sm font-semibold text-[#0c4a2b]">
                        Chưa có đánh giá
                      </div>
                      <p className="text-xs text-slate-600">
                        Hãy là người đầu tiên trải nghiệm và để lại đánh giá cho cụm sân này.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3.5 p-3.5 border border-[#e4ece8] rounded-2xl bg-[#f8fbf9]">
                        <div className="text-3xl font-black text-[#0c4a2b]">{ratingValue}</div>
                        <div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.round(ratingValue)
                                    ? 'fill-[#dfb03b] text-[#dfb03b]'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-slate-600 font-medium mt-0.5">
                            {reviewCount} đánh giá xác thực
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {sampleReviews.slice(0, Math.min(reviewCount, sampleReviews.length)).map((rev, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 border border-[#e4ece8] rounded-2xl space-y-1.5 bg-white"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#0c4a2b]">{rev.author}</span>
                              <span className="text-slate-500">{rev.time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className="w-3 h-3 fill-[#dfb03b] text-[#dfb03b]"
                                />
                              ))}
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{rev.content}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Lightbox Modal for Gallery Images */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-[60] bg-slate-950/85 flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center cursor-pointer focus:outline-none"
            title="Đóng ảnh"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImg}
            alt="Ảnh chi tiết sân"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  )
}
