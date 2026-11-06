import { useState } from 'react'
import { Heart, Navigation, Clock, Star } from 'lucide-react'
import type { BadmintonCourtItem } from '../mockData'

interface CourtCardItemProps {
  court: BadmintonCourtItem
  onBook: (court: BadmintonCourtItem) => void
  onToggleFavorite?: (id: string) => void
}

export const CourtCardItem: React.FC<CourtCardItemProps> = ({
  court,
  onBook,
  onToggleFavorite,
}) => {
  const [isFav, setIsFav] = useState(court.isFavorite ?? false)

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFav(!isFav)
    onToggleFavorite?.(court.id)
  }

  const handleOpenMap = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`https://maps.google.com/?q=${encodeURIComponent(court.address)}`, '_blank')
  }

  return (
    <div
      onClick={() => onBook(court)}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col group select-none"
    >
      {/* Top Image & Floating Badges */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={court.imageUrl}
          alt={court.name}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          loading="lazy"
        />

        {/* Top-Left Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
          {court.rating && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/95 text-slate-800 shadow-xs flex items-center gap-1 backdrop-blur-xs">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{court.rating}</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#10b981] text-white shadow-xs">
            Đơn ngày
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#d946ef] text-white shadow-xs">
            Sự kiện
          </span>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={handleFav}
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-rose-500 flex items-center justify-center border border-slate-200/60 transition-colors cursor-pointer"
            title="Thêm vào yêu thích"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-600'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={handleOpenMap}
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-600 flex items-center justify-center border border-slate-200/60 transition-colors cursor-pointer"
            title="Xem chỉ đường Google Maps"
          >
            <Navigation className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      {/* Bottom Info Section */}
      <div className="p-3.5 flex items-center gap-3">
        {/* Round Logo */}
        <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 shadow-2xs">
          <img
            src={court.logoUrl}
            alt={court.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 pr-1">
          <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
            {court.name}
          </h3>

          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            <span className="text-[#ea580c] font-semibold mr-1">[{court.distance}]</span>
            <span>{court.address}</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{court.openHours}</span>
          </div>
        </div>

        {/* Golden Yellow Action Button "ĐẶT LỊCH" */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onBook(court)
          }}
          className="px-3.5 py-2 rounded-lg bg-[#e5a92c] hover:bg-[#d49b24] active:bg-[#c48d1c] text-white font-extrabold text-xs uppercase tracking-wide transition-colors flex-shrink-0 cursor-pointer"
        >
          ĐẶT LỊCH
        </button>
      </div>
    </div>
  )
}
