import { useState, useMemo } from 'react'
import { Toaster, toast } from 'sonner'
import { Activity, Flame } from 'lucide-react'
import { Header } from './components/shared/Header'
import { CourtSearchBar } from './components/shared/CourtSearchBar'
import { CourtCardItem } from './modules/user/ai-search/CourtCardItem'
import { SmartFilterModal } from './modules/user/ai-search/SmartFilterModal'
import { AIChatPanel } from './modules/user/ai-search/AIChatPanel'
import { AuthModal } from './modules/user/auth/AuthModal'
import { ProfileModal } from './modules/user/profile/ProfileModal'
import { BookingConfirmModal } from './modules/user/ai-search/BookingConfirmModal'
import { BottomNav } from './components/shared/BottomNav'
import { KhamPhaView } from './modules/user/ai-search/KhamPhaView'
import { CourtMapView } from './modules/court/search/CourtMapView'
import { AccountView } from './modules/user/account/AccountView'

import {
  mockCurrentUser,
  mockNotifications,
  mockBadmintonCourts,
  defaultCriteria,
  type BadmintonCourtItem,
} from './modules/user/mockData'
import type { User, NotificationItem, CourtResult, SearchCriteria } from './modules/types/user'

export function App() {
  // Navigation View State: 'home' | 'map' | 'khampha' | 'trending' | 'account'
  const VIEW_INDEX: Record<'home' | 'map' | 'khampha' | 'trending' | 'account', number> = {
    home: 0,
    map: 1,
    khampha: 2,
    trending: 3,
    account: 4,
  }
  const [currentView, setCurrentView] = useState<'home' | 'map' | 'khampha' | 'trending' | 'account'>('home')
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right')

  const handleNavigateView = (newView: 'home' | 'map' | 'khampha' | 'trending' | 'account') => {
    if (newView === currentView) return
    const oldIdx = VIEW_INDEX[currentView]
    const newIdx = VIEW_INDEX[newView]
    setSlideDirection(newIdx > oldIdx ? 'right' : 'left')
    setCurrentView(newView)
  }

  // State
  const [currentUser, setCurrentUser] = useState<User | null>(mockCurrentUser)
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications)
  const [criteria, setCriteria] = useState<SearchCriteria>(defaultCriteria)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'map' | 'booked' | 'favorite'>('all')

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [bookingCourt, setBookingCourt] = useState<CourtResult | null>(null)

  // Filtered courts based on search term, activeTab, and criteria
  const filteredCourts = useMemo(() => {
    return mockBadmintonCourts.filter((court) => {
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchesName = court.name.toLowerCase().includes(term)
        const matchesAddr = court.address.toLowerCase().includes(term)
        const matchesDist = court.district.toLowerCase().includes(term)
        if (!matchesName && !matchesAddr && !matchesDist) return false
      }

      // Tab filter (Sân đã đặt / Yêu thích)
      if (activeTab === 'favorite' && !court.isFavorite) {
        return false
      }

      // District filter
      if (criteria.district && court.district !== criteria.district) {
        return false
      }

      // Max price filter
      if (criteria.maxPricePerHour && court.pricePerHour > criteria.maxPricePerHour) {
        return false
      }

      // Amenities filter
      if (criteria.amenities && criteria.amenities.length > 0) {
        const hasAll = criteria.amenities.every((a) => court.amenities.includes(a))
        if (!hasAll) return false
      }

      return true
    })
  }, [searchTerm, activeTab, criteria])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (criteria.district) count++
    if (criteria.maxPricePerHour) count++
    if (criteria.amenities && criteria.amenities.length > 0) count += criteria.amenities.length
    return count
  }, [criteria])

  // Notification handlers
  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const handleSimulateNewNotification = () => {
    const newNotif: NotificationItem = {
      id: 'notif_' + Date.now(),
      type: 'BOOKING_CONFIRMED',
      title: 'Đơn đặt sân mới đã xác nhận! 🏸',
      body: 'Phúc Long Badminton vừa duyệt lịch chơi của bạn tối mai lúc 19:00 - 21:00.',
      isRead: false,
      createdAt: 'Vừa xong',
    }
    setNotifications((prev) => [newNotif, ...prev])
    toast.success('Thông báo mới từ hệ thống SmashCourt!', {
      description: newNotif.body,
    })
  }

  // Booking action
  const handleOpenBooking = (court: BadmintonCourtItem) => {
    const asCourtResult: CourtResult = {
      courtId: court.id,
      facilityId: 'fac_' + court.id,
      facilityName: court.name,
      courtName: 'Sân số 1 (Thảm tiêu chuẩn BWF)',
      address: court.address,
      district: court.district,
      imageUrl: court.imageUrl,
      rating: court.rating || 4.8,
      reviewCount: court.reviewCount || 100,
      startTime: criteria.startTime || '19:00',
      endTime: criteria.endTime || '21:00',
      durationHours: 2,
      pricePerHour: court.pricePerHour,
      calculatedTotalPrice: court.pricePerHour * 2,
      amenities: court.amenities,
      availabilityCheckedAt: 'Vừa xong',
      isAvailable: true,
      googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(court.address)}`,
    }
    setBookingCourt(asCourtResult)
  }

  const handleConfirmBooking = (court: CourtResult) => {
    const bookingNotif: NotificationItem = {
      id: 'notif_bk_' + Date.now(),
      type: 'PAYMENT_SUCCESS',
      title: 'Đặt lịch thành công qua payOS! 🏸',
      body: `Đơn tại ${court.facilityName} (${court.courtName}) khung giờ ${court.startTime}-${court.endTime} đã xác nhận.`,
      isRead: false,
      createdAt: 'Vừa xong',
    }
    setNotifications((prev) => [bookingNotif, ...prev])

    toast.success('Đặt lịch thành công!', {
      description: `Mã đơn #SMC-${Math.floor(1000 + Math.random() * 9000)} đã được ghi nhận. Email Brevo & Lịch Google đã đồng bộ!`,
      duration: 5000,
    })
  }

  // AI sync handlers
  const handleApplyCriteriaFromAI = (extracted: Partial<SearchCriteria>) => {
    setCriteria((prev) => ({
      ...prev,
      ...extracted,
    }))
    if (extracted.district) {
      setSearchTerm(extracted.district)
    }
    toast.info('Bộ lọc đã tự động đồng bộ theo câu hỏi AI!', {
      icon: '✨',
    })
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#f8fafc] font-sans text-slate-900 ${
        currentView === 'map' ? 'h-screen overflow-hidden pb-0' : 'pb-20'
      }`}
    >
      {/* Toast notifications */}
      <Toaster richColors position="top-right" closeButton />

      {/* 1. Header with custom SmashCourt brand (hidden in map view for full-screen map experience) */}
      {currentView !== 'map' && (
        <Header
          currentUser={currentUser}
          notifications={notifications}
          onOpenAuth={(tab = 'login') => {
            setAuthInitialTab(tab)
            setIsAuthOpen(true)
          }}
          onOpenProfile={() => handleNavigateView('account')}
          onOpenAIChat={() => setIsAIChatOpen(true)}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onMarkNotificationRead={handleMarkNotificationRead}
          onSimulateNewNotification={handleSimulateNewNotification}
          onNavigateHome={() => handleNavigateView('home')}
        />
      )}

      {/* Main Container with Horizontal Slide Animation */}
      <div className="flex-1 w-full overflow-x-hidden">
        {currentView === 'map' ? (
          <main
            key="map"
            className={`w-full h-[calc(100vh-56px)] overflow-hidden ${
              slideDirection === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
            }`}
          >
            <CourtMapView
              courts={mockBadmintonCourts}
              onBookCourt={handleOpenBooking}
              onOpenAIChat={() => setIsAIChatOpen(true)}
              onSwitchToList={() => {
                handleNavigateView('home')
                setActiveTab('all')
              }}
            />
          </main>
        ) : (
          <main
            key={currentView}
            className={`max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 pb-28 ${
              slideDirection === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
            }`}
          >
            {/* View 1: Trang chủ */}
            {currentView === 'home' && (
              <div className="space-y-4">
                {/* Search Bar & Nav Pills */}
                <CourtSearchBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onOpenFilter={() => setIsFilterModalOpen(true)}
                  onOpenAIChat={() => setIsAIChatOpen(true)}
                  onSelectTab={(tab) => {
                    if (tab === 'map') {
                      handleNavigateView('map')
                    } else {
                      setActiveTab(tab)
                    }
                  }}
                  activeTab={activeTab}
                  activeFilterCount={activeFilterCount}
                />

                {/* Filter reset button if active */}
                {activeFilterCount > 0 && (
                  <div className="flex items-center justify-end text-xs text-slate-500 px-1">
                    <button
                      onClick={() => {
                        setCriteria(defaultCriteria)
                        setSearchTerm('')
                        toast.info('Đã xóa bộ lọc')
                      }}
                      className="text-[#1b7a42] hover:underline font-semibold text-[11px] cursor-pointer"
                    >
                      Xóa bộ lọc ({activeFilterCount})
                    </button>
                  </div>
                )}

                {/* Cards Grid */}
                {filteredCourts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto">
                    <Activity className="w-8 h-8 text-[#1b7a42] mx-auto mb-2" />
                    <h3 className="font-bold text-slate-800 text-sm">Không tìm thấy sân phù hợp</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem tất cả sân.
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setCriteria(defaultCriteria)
                        setActiveTab('all')
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1b7a42] text-white text-xs font-bold cursor-pointer"
                    >
                      Xem tất cả sân
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {filteredCourts.map((court) => (
                      <CourtCardItem
                        key={court.id}
                        court={court}
                        onBook={handleOpenBooking}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View 2: Khám phá */}
            {currentView === 'khampha' && (
              <KhamPhaView
                onBookCourt={(court) => setBookingCourt(court)}
                onOpenAIChat={() => setIsAIChatOpen(true)}
              />
            )}

            {/* View 3: Nổi bật */}
            {currentView === 'trending' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
                      <Flame className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Cơ sở & Buổi chơi nổi bật hôm nay
                      </h2>
                      <p className="text-xs text-slate-500">
                        Các cụm sân đạt đánh giá 4.8★ trở lên và các buổi chơi giao lưu đông thành viên nhất.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleNavigateView('home')
                      setActiveTab('all')
                    }}
                    className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#168039] hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    Xem tất cả sân →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {mockBadmintonCourts
                    .filter((c) => (c.rating || 0) >= 4.8)
                    .map((court) => (
                      <CourtCardItem
                        key={court.id}
                        court={court}
                        onBook={handleOpenBooking}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* View 4: Tài khoản */}
            {currentView === 'account' && (
              <AccountView
                currentUser={currentUser}
                onOpenAuth={(tab = 'login') => {
                  setAuthInitialTab(tab)
                  setIsAuthOpen(true)
                }}
                onUpdateUser={(updated) => setCurrentUser(updated)}
                onLogout={() => setCurrentUser(null)}
                onNavigateHome={() => handleNavigateView('home')}
                onOpenAIChat={() => setIsAIChatOpen(true)}
              />
            )}
          </main>
        )}
      </div>

      {/* 4. Bottom Navigation Bar */}
      <BottomNav
        activeTab={currentView}
        onSelectTab={(tab) => {
          handleNavigateView(tab)
          if (tab === 'home') {
            setActiveTab('all')
          }
        }}
        onOpenProfile={() => handleNavigateView('account')}
        onOpenAuth={() => {
          setAuthInitialTab('login')
          setIsAuthOpen(true)
        }}
        isLoggedIn={!!currentUser}
      />

      {/* Modals for TV1 */}

      {/* Smart Filter Drawer/Modal */}
      <SmartFilterModal
        isOpen={isFilterModalOpen}
        criteria={criteria}
        onClose={() => setIsFilterModalOpen(false)}
        onChangeCriteria={setCriteria}
        onApply={() => toast.success(`Đã áp dụng bộ lọc! Tìm thấy ${filteredCourts.length} sân`)}
        onReset={() => {
          setCriteria(defaultCriteria)
          toast.info('Đã đặt lại bộ lọc')
        }}
      />

      {/* AI Court Finder Chat Panel (Spring AI Orchestrator) */}
      <AIChatPanel
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        onApplyCriteria={handleApplyCriteriaFromAI}
      />

      {/* Booking Confirm Modal (Holding HELD & TV3 Hand-off) */}
      <BookingConfirmModal
        isOpen={!!bookingCourt}
        court={bookingCourt}
        onClose={() => setBookingCourt(null)}
        onConfirmBooking={handleConfirmBooking}
      />

      {/* Auth Modal (Login / Register / Google OIDC) */}
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authInitialTab}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user)
          setIsAuthOpen(false)
        }}
      />

      {/* Profile Modal (FCM Web Push & Google Calendar Sync) */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          user={currentUser}
          onClose={() => setIsProfileOpen(false)}
          onUpdateUser={(updated) => setCurrentUser(updated)}
          onLogout={() => {
            setCurrentUser(null)
            setIsProfileOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default App
