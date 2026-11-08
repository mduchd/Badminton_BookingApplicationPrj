import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Star,
  CheckCircle2,
  Calendar,
  Share2,
  Heart,
  Navigation,
  Info,
  ShieldCheck,
  ExternalLink,
  Wrench,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ApiHttpError, courtApi } from '../services/courtApi'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'

interface CourtDetailViewProps {
  favoriteIds: string[]
  onToggleFavorite: (id: string) => void
}

export const CourtDetailView: React.FC<CourtDetailViewProps> = ({ favoriteIds, onToggleFavorite }) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, error, isPending: loading } = useQuery({
    queryKey: ['facilityDetail', id],
    queryFn: () => courtApi.getFacilityDetail(id!),
    enabled: Boolean(id),
    retry: false,
  })
  const facility = data?.facility
  const priceRules = data?.priceRules ?? []
  const maintenanceBlocks = data?.maintenanceBlocks ?? []
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [pricingTab, setPricingTab] = useState<'CASUAL' | 'FIXED_MONTHLY'>('CASUAL')
  const isFavorite = id != null && favoriteIds.includes(id)
  useEffect(() => setSelectedImageIndex(0), [id])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-sm font-semibold text-slate-600">
        Đang tải thông tin cụm sân...
      </div>
    )
  }

  if (!facility || (id && facility.id !== id)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Info className="w-12 h-12 text-slate-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">{error instanceof ApiHttpError && error.status === 404 ? 'Không tìm thấy cụm sân' : 'Không thể tải thông tin cụm sân'}</h2>
        <p className="text-slate-600 text-sm mb-6 max-w-md">
          Cụm sân này có thể đã tạm ngưng hoạt động hoặc đường dẫn không chính xác.
        </p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="px-5 py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white font-bold text-sm cursor-pointer transition-colors"
        >
          Quay lại trang chủ
        </button>
      </div>
    )
  }

  const displayedRules = priceRules.filter(
    (r) => (r.customerType || 'CASUAL') === pricingTab
  )
  const effectiveRules = displayedRules.length > 0 ? displayedRules : priceRules

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: facility.name,
          text: `Đặt sân cầu lông tại ${facility.name} qua SmashCourt!`,
          url: window.location.href,
        })
        .catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Đã sao chép liên kết vào bộ nhớ tạm')
    }
  }

  const handleOpenMap = () => {
    const targetUrl =
      facility.mapsDirectionsUrl ||
      `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`
    window.open(targetUrl, '_blank')
  }

  const embedSrc =
    facility.mapsEmbedUrl ||
    `https://maps.google.com/maps?q=${facility.latitude},${facility.longitude}&z=16&output=embed`

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-6 pb-24 lg:pb-8">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleFavorite(facility.id)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-rose-500 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Lưu yêu thích"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'text-rose-500 fill-rose-500' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#168039] hover:bg-slate-50 transition-colors cursor-pointer"
            title="Chia sẻ"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/courts/${facility.id}/book`)}
            className="hidden sm:flex px-4 py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Đặt sân ngay</span>
          </button>
        </div>
      </div>

      {/* Main Image Gallery */}
      <div className="space-y-3">
        <div className="relative h-64 sm:h-96 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
          <img
            src={facility.galleryImages[selectedImageIndex] || facility.imageUrl}
            alt={facility.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-900 border border-slate-200 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>
                {facility.rating} ({facility.reviewCount} đánh giá)
              </span>
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#168039] text-white">
              {facility.status === 'maintenance' ? 'Đang bảo trì một phần' : 'Đang hoạt động'}
            </span>
          </div>
        </div>

        {/* Thumbnail Selector */}
        {facility.galleryImages.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {facility.galleryImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                  selectedImageIndex === idx
                    ? 'border-[#168039]'
                    : 'border-slate-200 opacity-75 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Facility Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {facility.name}
            </h1>
            <div className="flex items-center gap-2 text-slate-700 text-xs sm:text-sm font-medium mt-1.5 flex-wrap">
              <MapPin className="w-4 h-4 text-[#168039] shrink-0" />
              <span>{facility.normalizedAddress || facility.address}</span>
              <span className="text-slate-300">|</span>
              <span className="text-amber-700 font-semibold">{facility.distance}</span>
            </div>
          </div>

          <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span className="text-xs font-semibold text-slate-600">Khung giá tham khảo</span>
            <span className="text-xl sm:text-2xl font-black text-[#168039]">
              {(facility.minPrice || facility.pricePerHour).toLocaleString('vi-VN')} đ
              <span className="text-xs font-semibold text-slate-600">/giờ</span>
            </span>
          </div>
        </div>

        {/* Quick Contact & Action Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <Clock className="w-5 h-5 text-[#168039] shrink-0" />
            <div>
              <div className="text-xs text-slate-600 font-medium">Giờ hoạt động</div>
              <div className="text-sm font-bold text-slate-900">{facility.openHours}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <Phone className="w-5 h-5 text-[#168039] shrink-0" />
            <div>
              <div className="text-xs text-slate-600 font-medium">Hotline cụm sân</div>
              <div className="text-sm font-bold text-slate-900">{facility.phone}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenMap}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-emerald-50 hover:border-emerald-200 transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-[#168039] shrink-0" />
              <div>
                <div className="text-xs text-slate-600 font-medium">Dẫn đường trực tiếp</div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-[#168039]">
                  Mở Google Maps
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[#168039]" />
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 divide-y divide-slate-200">
          {/* Section 1: Giới thiệu & Tiện ích */}
          <div className="pb-6 space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Giới thiệu cơ sở</h2>
            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {facility.description}
            </p>

            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-600 mb-3">Tiện ích & Dịch vụ tại sân</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {facility.amenities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#168039] shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Danh sách sân con */}
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Danh sách sân con ({facility.subCourts.length} sân)
              </h2>
              <span className="text-xs font-semibold text-slate-600">Tiêu chuẩn BWF</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {facility.subCourts.map((court) => (
                <div
                  key={court.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{court.name}</h3>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {court.surfaceType ||
                        (court.courtType === 'vip'
                          ? 'Thảm VIP cao cấp'
                          : court.courtType === 'training'
                          ? 'Thảm tập luyện'
                          : 'Thảm tiêu chuẩn')}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                      court.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {court.status === 'active' ? 'Đang mở' : 'Bảo trì'}
                  </span>
                </div>
              ))}
            </div>

            {maintenanceBlocks.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-700" />
                  <span>Thông báo lịch bảo trì định kỳ:</span>
                </div>
                {maintenanceBlocks.slice(0, 3).map((blk) => (
                  <div key={blk.id}>
                    <strong>{blk.courtName}</strong>: {blk.date} ({blk.startTime} - {blk.endTime}) —{' '}
                    {blk.reason}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Bảng giá niêm yết */}
          <div className="py-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Bảng giá niêm yết theo khung giờ
              </h2>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 self-start">
                <button
                  type="button"
                  onClick={() => setPricingTab('CASUAL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    pricingTab === 'CASUAL'
                      ? 'bg-white text-[#168039]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Khách vãng lai
                </button>
                <button
                  type="button"
                  onClick={() => setPricingTab('FIXED_MONTHLY')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    pricingTab === 'FIXED_MONTHLY'
                      ? 'bg-white text-[#168039]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cố định tháng
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50">
                    <th className="py-2.5 px-3">Khung thời gian</th>
                    <th className="py-2.5 px-3">Áp dụng</th>
                    <th className="py-2.5 px-3 text-right">Đơn giá / giờ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {effectiveRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {rule.startTime} - {rule.endTime}
                        <div className="text-xs font-medium text-slate-600">{rule.name}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {rule.dayOfWeek === 'ALL'
                          ? 'Tất cả các ngày'
                          : rule.dayOfWeek === 'WEEKDAY'
                          ? 'Thứ 2 - Thứ 6'
                          : 'Thứ 7 & Chủ nhật'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-[#168039]">
                        {rule.pricePerHour.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Bản đồ Google Maps Embed */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Vị trí & Bản đồ nhúng
              </h2>
              <button
                type="button"
                onClick={handleOpenMap}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#168039] hover:underline cursor-pointer"
              >
                <span>Mở trong Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
              <iframe
                title="Bản đồ vị trí sân"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={embedSrc}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking CTA Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5 sticky top-20">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Chọn lịch & Khung giờ</h3>
              <p className="text-xs text-slate-600 mt-1">
                Xem ma trận lịch trống trực tiếp theo sân hoặc theo giờ, giữ chỗ an toàn 10 phút.
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 font-medium border-t border-b border-slate-100 py-3">
              <div className="flex items-center justify-between">
                <span>Số sân con:</span>
                <span className="font-bold text-slate-900">{facility.subCourts.length} sân</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Thời gian mở cửa:</span>
                <span className="font-bold text-slate-900">{facility.openHours}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Chính sách hoàn hủy:</span>
                <span className="font-bold text-[#168039]">Trước 12 giờ miễn phí</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/courts/${facility.id}/book`)}
              className="w-full py-3.5 px-4 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Xem lịch trống & Đặt sân</span>
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-600 justify-center">
              <ShieldCheck className="w-4 h-4 text-[#168039]" />
              <span>Cam kết giữ chỗ an toàn qua SmashCourt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Booking Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div>
          <span className="text-[11px] font-semibold text-slate-600 block">Giá chỉ từ</span>
          <span className="text-base font-black text-[#168039]">
            {(facility.minPrice || facility.pricePerHour).toLocaleString('vi-VN')} đ
            <span className="text-xs font-semibold text-slate-600">/h</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/courts/${facility.id}/book`)}
          className="px-5 py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          <span>Xem lịch & Đặt sân</span>
        </button>
      </div>
    </div>
  )
}
