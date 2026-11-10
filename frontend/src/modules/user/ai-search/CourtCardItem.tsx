import { useNavigate } from 'react-router-dom'
import { Heart, Navigation, Clock, Star } from 'lucide-react'
import type { BadmintonCourtItem } from '../../types/court'
import { logoThumbnail, venueThumbnail } from '../../../lib/venueThumbnail'

interface CourtCardItemProps {
  court: BadmintonCourtItem
  onBook?: (court: BadmintonCourtItem) => void
  onToggleFavorite?: (id: string) => void
  onSelectCourt?: (court: BadmintonCourtItem) => void
  index?: number
}

export const CourtCardItem: React.FC<CourtCardItemProps> = ({
  court,
  onBook,
  onToggleFavorite,
  onSelectCourt,
  index = 0,
}) => {
  const navigate = useNavigate()
  const isFav = court.isFavorite ?? false

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.(court.id)
  }

  const handleOpenMap = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`https://maps.google.com/?q=${encodeURIComponent(court.address)}`, '_blank')
  }

  const handleCardClick = () => {
    if (onSelectCourt) {
      onSelectCourt(court)
    } else if (onBook) {
      onBook(court)
    } else {
      navigate(`/courts/${court.id}`)
    }
  }

  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onBook) {
      onBook(court)
    } else {
      navigate(`/courts/${court.id}/book`)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      style={{ '--stagger-delay': `${Math.min(index * 45, 450)}ms` } as React.CSSProperties}
      className="card-enter bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col group select-none"
    >
      {/* Top Image & Floating Badges */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100">
        {court.imageUrl && <img src={venueThumbnail(court.imageUrl)} alt={court.name} className="w-full h-full object-cover" loading={index < 3 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" onError={(event) => { if (event.currentTarget.getAttribute('src') !== court.imageUrl) event.currentTarget.src = court.imageUrl }} />}

        {/* Top-Left Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
          {court.reviewCount > 0 && court.rating > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/95 text-slate-800 shadow-xs flex items-center gap-1 backdrop-blur-xs">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{court.rating}</span>
            </span>
          )}
        </div>

        {/* Top-Right Action Buttons */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={handleFav}
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-rose-500 flex items-center justify-center border border-slate-200/60 transition-transform duration-200 active:scale-75 cursor-pointer"
            title="Thêm vào yêu thích"
          >
            <Heart
              className={`w-4 h-4 transition-all duration-200 ${
                isFav ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-600'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={handleOpenMap}
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-600 flex items-center justify-center border border-slate-200/60 transition-transform duration-200 active:scale-75 cursor-pointer"
            title="Xem chỉ đường Google Maps"
          >
            <Navigation className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      {/* Bottom Info Section */}
      <div className="p-3.5 grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3">
        {/* Round Logo */}
        <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 shadow-2xs">
          {court.logoUrl && <img src={logoThumbnail(court.logoUrl)} alt={court.name} width={48} height={48} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={(event) => { if (event.currentTarget.getAttribute('src') !== court.logoUrl) event.currentTarget.src = court.logoUrl }} />}
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 pr-1">
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 break-words group-hover:text-emerald-700 transition-colors">
            <button type="button" onClick={(event) => { event.stopPropagation(); handleCardClick() }} className="cursor-pointer text-left" aria-label={`Xem chi tiết ${court.name}`}>{court.name}</button>
          </h3>

          <div className="text-[11px] text-slate-700 font-medium truncate mt-0.5">
            {court.distance && <span className="text-[#ea580c] font-semibold mr-1">[{court.distance}]</span>}
            <span>{court.address}</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-600 font-medium mt-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{court.openHours}</span>
          </div>
        </div>

        {/* Action Button "Đặt lịch" */}
        <button
          type="button"
          onClick={handleBookClick}
          className="col-span-2 w-full px-3.5 py-2 rounded-lg bg-[#1b7a42] hover:bg-[#156335] text-white font-bold text-xs transition-colors flex-shrink-0 cursor-pointer"
        >
          Đặt lịch
        </button>
      </div>
    </div>
  )
}
