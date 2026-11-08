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
import type { BadmintonCourtItem } from '../../modules/types/court'
import { useQuery } from '@tanstack/react-query'
import { courtApi } from '../../modules/court/services/courtApi'

function safeMessengerUrl(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && url.hostname.toLowerCase() === 'm.me' && !url.username && !url.password && !url.port && url.pathname.length > 1 ? url.href : null
  } catch {
    return null
  }
}

interface CourtContactModalProps {
  isOpen: boolean
  onClose: () => void
  court?: BadmintonCourtItem | null
}

export const CourtContactModal: React.FC<CourtContactModalProps> = ({
  isOpen,
  onClose,
  court,
}) => {
  const [copied, setCopied] = useState(false)

  const currentCourt = court
  const { data } = useQuery({
    queryKey: ['facilityDetail', court?.id],
    queryFn: () => courtApi.getFacilityDetail(court!.id),
    enabled: isOpen && Boolean(court),
    retry: false,
  })
  if (!isOpen) return null

  const courtName = currentCourt?.name || 'Cụm sân'
  const formattedPhone = (data?.facility.phone || currentCourt?.phone || '').split('|')[0].split(' - ')[0].trim()
  const cleanPhone = formattedPhone.replace(/[^\d+]/g, '')
  const messengerUrl = safeMessengerUrl(data?.facility ? data.facility.messengerUrl : currentCourt?.messengerUrl)

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
                Liên hệ qua Zalo, Messenger hoặc gọi điện
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
                  <span>Giờ mở cửa: {currentCourt.openHours || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Contact Methods (Zalo, Messenger, Hotline) */}
          <div className="space-y-2.5">
            <span className="text-xs font-black text-slate-900 tracking-wide">
              Kênh liên hệ trực tiếp:
            </span>

            {cleanPhone ? (
              <>
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
              </>
            ) : <p className="text-sm text-slate-600">Cụm sân chưa công bố số điện thoại.</p>}
            {messengerUrl ? (
              <a href={messengerUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-blue-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <img src="/logos/messenger.svg" alt="" className="w-11 h-11 object-contain shrink-0" />
                  <div className="min-w-0"><span className="text-sm font-bold text-slate-900">Chat qua Messenger</span>
                    <p className="text-xs text-slate-600 font-medium">Nhắn tin cho chủ sân trên Messenger</p></div>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-[#0068ff] text-white text-xs font-bold flex items-center gap-1 shrink-0">Nhắn tin <ExternalLink className="w-3 h-3" /></span>
              </a>
            ) : (
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200">
                <img src="/logos/messenger.svg" alt="" className="w-11 h-11 object-contain shrink-0" />
                <div><span className="text-sm font-bold text-slate-900">Chat qua Messenger</span>
                  <p className="text-xs text-slate-600">Chủ sân chưa cập nhật liên kết Messenger.</p></div>
              </div>
            )}
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
            Chọn kênh liên hệ phù hợp
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
