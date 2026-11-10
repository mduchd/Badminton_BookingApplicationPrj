import { MapPin, Star, Clock, CheckCircle2, ExternalLink, CalendarPlus } from 'lucide-react'
import type { CourtResult } from '../../types/user'
import { formatPrice } from '../../../lib/utils'

interface CourtResultCardProps {
  court: CourtResult
  onBookNow: (court: CourtResult) => void
}

export const CourtResultCard: React.FC<CourtResultCardProps> = ({ court, onBookNow }) => {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs hover:border-[#1b7a42]/40 transition-all duration-200 overflow-hidden flex flex-col group select-none">
      {/* Image Container with Badges */}
      <div className="relative h-50 sm:h-54 w-full overflow-hidden bg-slate-100">
        <img
          src={court.imageUrl}
          alt={court.facilityName}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover "
        />
        <div className="absolute inset-0 bg-black/35" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-[#10b981] text-white shadow-xs flex items-center gap-1.5 backdrop-blur-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sân đang trống
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900/75 text-white backdrop-blur-xs">
            {court.district}
          </span>
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black bg-white/95 text-slate-800 shadow-xs flex items-center gap-1.5 backdrop-blur-xs">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>{court.rating}</span>
          <span className="text-slate-500 font-medium">({court.reviewCount})</span>
        </div>

        {/* Facility Name on Image */}
        <div className="absolute bottom-3.5 left-4 right-4 text-white">
          <p className="text-xs font-bold text-emerald-300 tracking-wider ">Cụm sân cầu lông</p>
          <h4 className="text-base sm:text-lg font-black text-white truncate drop-shadow-xs">{court.facilityName}</h4>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Court specific name */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">{court.courtName}</span>
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg flex-shrink-0">
              {court.availabilityCheckedAt}
            </span>
          </div>

          {/* Address with Google Maps link */}
          <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 font-medium">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1 flex-1">{court.address}</span>
            <a
              href={court.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#1b7a42] hover:underline font-bold inline-flex items-center gap-1 flex-shrink-0"
              title="Mở trên Google Maps"
            >
              <span>Bản đồ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Time slot indicator */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <Clock className="w-4 h-4 text-[#1b7a42]" />
              <span>Khung giờ trống:</span>
            </div>
            <span className="font-black text-[#1b7a42] bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
              {court.startTime} – {court.endTime} ({court.durationHours}h)
            </span>
          </div>

          {/* Amenities tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {court.amenities.slice(0, 3).map((amenity) => (
              <span
                key={amenity}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700"
              >
                {amenity}
              </span>
            ))}
            {court.amenities.length > 3 && (
              <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500">
                +{court.amenities.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Tổng tạm tính ({court.durationHours}h)</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-[#1b7a42]">
                {formatPrice(court.calculatedTotalPrice)}
              </span>
              <span className="text-xs text-slate-500 font-medium">({formatPrice(court.pricePerHour)}/h)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onBookNow(court)}
            className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-[#e5a92c] hover:bg-[#d49b24] active:bg-[#c48d1c] text-slate-900 font-black text-xs sm:text-sm tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Đặt ngay</span>
          </button>
        </div>
      </div>
    </div>
  )
}
