import React, { useState } from 'react'
import {
  X,
  Phone,
  MessageSquare,
  Copy,
  Check,
  MapPin,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BadmintonCourtItem } from '../../modules/user/mockData'
import { appStore } from '../../lib/appStore'

interface CourtContactModalProps {
  isOpen: boolean
  onClose: () => void
  court?: BadmintonCourtItem | null
  allCourts?: BadmintonCourtItem[]
}

export const CourtContactModal: React.FC<CourtContactModalProps> = ({
  isOpen,
  onClose,
  court,
  allCourts = [],
}) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  // Directly link to the targeted court without any dropdown
  const currentCourt = court || allCourts[0]
  const facility = currentCourt ? appStore.getFacilityById(currentCourt.id) : null

  const courtName = currentCourt?.name || 'Sân Cầu Lông SmashCourt'
  const rawPhone = facility?.phone || '0988 234 567'
  const cleanPhone = rawPhone.replace(/\D/g, '') || '0988234567'
  const formattedPhone = rawPhone

  // Pre-made quick message template for user convenience
  const sampleMessage = `Chào ${courtName}, mình liên hệ qua ứng dụng SmashCourt cần hỗ trợ tư vấn giờ chơi và đặt sân. Nhờ ban quản lý phản hồi giúp mình nhé!`

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(sampleMessage)
    setCopied(true)
    toast.success('Đã sao chép tin nhắn mẫu! Bạn có thể dán vào Zalo hoặc Messenger.')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container: Safe max height with clean internal scroll */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[min(90vh,700px)] flex flex-col z-10">
        
        {/* Header - Flat, light background, high contrast dark title, no color block */}
        <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#168039] text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-normal truncate">
                Nhắn tin với Chủ sân
              </h2>
              <p className="text-xs text-slate-600 font-medium truncate">
                Liên hệ trực tiếp qua Zalo, Messenger hoặc Gọi điện
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Direct Targeted Court Info Card (No dropdown) */}
          {currentCourt && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3">
              <img
                src={currentCourt.logoUrl || currentCourt.imageUrl}
                alt={currentCourt.name}
                className="w-13 h-13 rounded-xl object-cover shrink-0 border border-slate-200"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {currentCourt.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{currentCourt.address}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Giờ mở cửa: {currentCourt.openHours || '05:00 - 23:00'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Contact Methods (Zalo, Messenger, Hotline) */}
          <div className="space-y-2.5">
            <span className="text-xs font-black text-slate-900 tracking-wide">
              Kênh liên hệ trực tiếp:
            </span>

            {/* 1. Official Zalo Channel */}
            <a
              href={`https://zalo.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/logos/zalo.svg"
                  alt="Zalo"
                  className="w-11 h-11 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">Chat qua Zalo</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#0068ff]">
                      Nhanh nhất
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    Số Zalo quản lý: {formattedPhone}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#0068ff] hover:bg-[#0055d4] text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors">
                <span>Nhắn tin</span>
                <ExternalLink className="w-3 h-3 text-white" />
              </div>
            </a>

            {/* 2. Official Facebook Messenger Channel */}
            <a
              href="https://m.me/smashcourt.vietnam"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/logos/messenger.svg"
                  alt="Messenger"
                  className="w-11 h-11 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">Facebook Messenger</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    Fanpage chính thức: SmashCourt Badminton
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#0084ff] hover:bg-[#0070da] text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors">
                <span>Mở chat</span>
                <ExternalLink className="w-3 h-3 text-white" />
              </div>
            </a>

            {/* 3. Direct Phone Call */}
            <a
              href={`tel:${cleanPhone}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#168039] text-white flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-900">Gọi Hotline trực tiếp</span>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    Bấm để gọi ngay: {formattedPhone}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors">
                <span>Gọi điện</span>
                <Phone className="w-3 h-3 text-white" />
              </div>
            </a>
          </div>

          {/* Quick message template */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Mẫu tin nhắn nhanh gửi chủ sân:</span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex items-center gap-1 text-xs font-bold text-[#168039] hover:text-[#136c30] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#168039]" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200">
              "{sampleMessage}"
            </p>
          </div>
        </div>

        {/* Footer - Flat, clean close button */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-600 font-medium">
            Phản hồi nhanh qua Zalo &amp; Hotline
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  )
}
