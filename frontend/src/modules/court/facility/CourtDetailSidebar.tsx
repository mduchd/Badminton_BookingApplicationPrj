import React from 'react'
import { X, MapPin, Clock, Navigation } from 'lucide-react'
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

export const CourtDetailSidebar: React.FC<CourtDetailSidebarProps> = ({ court, isOpen, onClose, onBook }) => {
  if (!isOpen || !court) return null
  const facility = appStore.getFacilityById(court.id)
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Thông tin cụm sân">
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 bg-slate-900/50 cursor-pointer" />
      <aside className="relative w-full max-w-md h-full overflow-y-auto bg-white p-5 text-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold break-words">{court.name}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-2 cursor-pointer hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4 py-5 text-sm">
          <p className="flex items-start gap-2"><MapPin className="w-4 h-4 shrink-0 mt-0.5" />{court.address}</p>
          {court.openHours && <p className="flex items-center gap-2"><Clock className="w-4 h-4" />{court.openHours}</p>}
          {court.rating != null && <p>Đánh giá: {court.rating}{court.reviewCount != null ? ` (${court.reviewCount} lượt)` : ''}</p>}
          {facility?.phone && <p>Số điện thoại: <a className="text-[#1b7a42]" href={`tel:${facility.phone}`}>{facility.phone}</a></p>}
          {facility?.description && <p className="break-words">{facility.description}</p>}
          {court.amenities.length > 0 && <p>Tiện ích: {court.amenities.join(', ')}</p>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <a href={`https://maps.google.com/?q=${encodeURIComponent(court.address)}`} target="_blank" rel="noreferrer" className="px-4 py-2 border border-slate-300 text-sm cursor-pointer flex items-center gap-2"><Navigation className="w-4 h-4" /> Chỉ đường</a>
          {onBook && <button type="button" onClick={() => { onClose(); onBook(court) }} className="px-4 py-2 bg-[#1b7a42] text-white text-sm cursor-pointer">Đặt lịch</button>}
        </div>
      </aside>
    </div>
  )
}
