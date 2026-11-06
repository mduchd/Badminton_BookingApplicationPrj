import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bell, CheckCheck, Clock, CalendarCheck, CreditCard, AlertCircle, X } from 'lucide-react'
import type { NotificationItem } from '../../types/user'
import { toast } from 'sonner'

interface NotificationBellProps {
  notifications: NotificationItem[]
  onMarkAllAsRead: () => void
  onMarkAsRead: (id: string) => void
  onSimulateNewNotification: () => void
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onSimulateNewNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState<{ top: number; right: number }>({
    top: 64,
    right: 16,
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const top = rect.bottom + 8
      const isMobile = window.innerWidth < 640
      const right = isMobile ? 12 : Math.max(16, window.innerWidth - rect.right)
      setCoords({ top, right })
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    updatePosition()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, updatePosition])

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return <CalendarCheck className="w-4 h-4 text-emerald-600" />
      case 'PAYMENT_SUCCESS':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      case 'REMINDER_DUE':
        return <Clock className="w-4 h-4 text-amber-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-indigo-600" />
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center text-white transition-all duration-200 cursor-pointer"
        aria-label="Thông báo"
        title="Thông báo"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        {unreadCount > 0 && (
          <span className="badge-pop absolute -top-1 -right-1 flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white ring-2 ring-[#1b7a42]">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] pointer-events-none">
            {/* Backdrop for outside click */}
            <div
              className="fixed inset-0 bg-transparent pointer-events-auto"
              onClick={() => setIsOpen(false)}
            />

            {/* Notification Dropdown (Rendered at top-level body to prevent stacking context clipping) */}
            <div
              style={{
                top: `${coords.top}px`,
                right: `${coords.right}px`,
              }}
              className="fixed w-[calc(100vw-24px)] sm:w-96 max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
            >
              {/* Header (Solid Flat Color) */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#1b7a42]" />
                  <span className="font-semibold text-slate-800 text-sm">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="bg-[#1b7a42] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkAllAsRead()
                        toast.success('Đã đánh dấu tất cả là đã đọc')
                      }}
                      className="text-xs text-[#1b7a42] hover:underline font-medium flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Đã đọc
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[min(24rem,calc(100vh-140px))] overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-800 font-bold">Chưa có thông báo nào</p>
                    <p className="text-xs text-slate-600 mt-1 font-medium">Thông báo về lịch đặt sân sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  notifications.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => onMarkAsRead(item.id)}
                      style={{ '--stagger-delay': `${Math.min(idx * 35, 300)}ms` } as React.CSSProperties}
                      className={`fade-in-item p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                        !item.isRead ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        {getIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <p
                            className={`text-xs font-semibold truncate ${
                              !item.isRead ? 'text-slate-900 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {item.title}
                          </p>
                          <span className="text-[10px] text-slate-600 font-medium flex-shrink-0">{item.createdAt}</span>
                        </div>
                        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-normal">
                          {item.body}
                        </p>
                      </div>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#1b7a42] flex-shrink-0 mt-2" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 text-[11px] font-medium">Thông báo tức thời</span>
                <button
                  type="button"
                  onClick={onSimulateNewNotification}
                  className="text-xs font-medium text-[#1b7a42] hover:underline cursor-pointer"
                >
                  + Giả lập nhận thông báo
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
