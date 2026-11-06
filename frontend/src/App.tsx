import { useState, useMemo } from 'react'
import { Toaster, toast } from 'sonner'
import { Activity, Flame, CalendarCheck } from 'lucide-react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { Header } from './components/shared/Header'
import { CourtSearchBar } from './components/shared/CourtSearchBar'
import { CourtCardItem } from './modules/user/ai-search/CourtCardItem'
import { SmartFilterModal } from './modules/user/ai-search/SmartFilterModal'
import { AIChatPanel } from './modules/user/ai-search/AIChatPanel'
import { AuthModal } from './modules/user/auth/AuthModal'
import { ProfileModal } from './modules/user/profile/ProfileModal'
import { BottomNav } from './components/shared/BottomNav'
import { KhamPhaView } from './modules/user/ai-search/KhamPhaView'
import { CourtMapView } from './modules/court/search/CourtMapView'
import { AccountView } from './modules/user/account/AccountView'

// TV3 Booking & Payment components
import { MyBookingsList } from './modules/booking/components/MyBookingsList'
import { CourtBookingModal } from './modules/booking/components/CourtBookingModal'
import { bookingApi } from './modules/booking/services/bookingApi'
import type { BookingResponse } from './modules/booking/types'

import {
  mockCurrentUser,
  mockNotifications,
  mockBadmintonCourts,
  defaultCriteria,
  type BadmintonCourtItem,
} from './modules/user/mockData'
import type { User, NotificationItem, CourtResult, SearchCriteria } from './modules/types/user'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function MainApp() {
  const qc = useQueryClient()

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

  // Booking Modal State (TV3)
  const [bookingCourtInfo, setBookingCourtInfo] = useState<{
    courtId: number
    courtName: string
    facilityName: string
    facilityAddress?: string
  } | null>(null)

  // Query My Bookings (TV3 Real Data)
  const { data: myBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => bookingApi.getMyBookings(1),
  })

  // Mutation Hủy đơn (TV3)
  const cancelBookingMutation = useMutation({
    mutationFn: (id: number) => bookingApi.cancelBooking(id, 1),
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ['myBookings'] })
      qc.invalidateQueries({ queryKey: ['courtAvailability'] })
      toast.success('Hủy đặt chỗ thành công!', {
        description: `Đơn #SMC-${b.id} đã được hủy và khung giờ đã được giải phóng.`,
      })
    },
    onError: (err: any) => {
      toast.error('Hủy đơn không thành công', {
        description: err.response?.data?.message || err.message,
      })
    },
  })

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

      // Tab filter (Yêu thích)
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
      title: 'Đơn đặt sân mới đã xác nhận!',
      body: 'SmashCourt vừa ghi nhận lịch chơi của bạn khung giờ tối mai lúc 19:00 - 21:00.',
      isRead: false,
      createdAt: 'Vừa xong',
    }
    setNotifications((prev) => [newNotif, ...prev])
    toast.success('Thông báo mới từ hệ thống SmashCourt!', {
      description: newNotif.body,
    })
  }

  // Booking action: Mở Modal Lưới Chọn Giờ Đặt Sân (TV3)
  const handleOpenBooking = (court: BadmintonCourtItem | CourtResult) => {
    const numericCourtId = 'courtId' in court ? Number(court.courtId) : Number(court.id)
    const courtName = 'courtName' in court && court.courtName ? String(court.courtName) : ('name' in court ? String(court.name) : 'Sân số 1 (Thảm Yonex)')
    const facilityName = 'facilityName' in court && court.facilityName ? String(court.facilityName) : ('name' in court ? String(court.name) : 'Cụm Sân SmashCourt')
    const address = 'address' in court ? court.address : ''

    setBookingCourtInfo({
      courtId: Number.isNaN(numericCourtId) ? 1 : numericCourtId,
      courtName,
      facilityName,
      facilityAddress: address,
    })
  }

  // Sau khi tạo đơn HELD thành công
  const handleBookingSuccess = (booking: BookingResponse) => {
    const bookingNotif: NotificationItem = {
      id: 'notif_bk_' + Date.now(),
      type: 'BOOKING_CONFIRMED',
      title: 'Giữ chỗ sân thành công! 🏸',
      body: `Đơn #SMC-${booking.id} tại ${booking.facilityName} (${booking.courtName}) đang được giữ trong 10 phút.`,
      isRead: false,
      createdAt: 'Vừa xong',
    }
    setNotifications((prev) => [bookingNotif, ...prev])

    toast.success('Giữ chỗ thành công (10 phút)!', {
      description: `Mã đơn #SMC-${booking.id} đã được khóa giờ. Bạn có thể xem trong mục 'Sân đã đặt'.`,
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

      {/* 1. Header with custom SmashCourt brand */}
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
              onBookCourt={(c) => handleOpenBooking(c)}
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
                      type="button"
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

                {/* Tab "Sân đã đặt" (TV3 Booking Management) */}
                {activeTab === 'booked' ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1b7a42] flex items-center justify-center font-bold">
                          <CalendarCheck className="w-5 h-5 text-[#1b7a42]" />
                        </div>
                        <div>
                          <h2 className="font-bold text-slate-900 text-base">Quản lý lịch đặt sân của bạn</h2>
                          <p className="text-xs text-slate-500">Xem các sân đang giữ chỗ (10 phút) và lịch chơi đã xác nhận</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-[#1b7a42] hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        ← Đặt thêm sân mới
                      </button>
                    </div>

                    <MyBookingsList
                      bookings={myBookings}
                      onCancelBooking={(id) => cancelBookingMutation.mutate(id)}
                      isLoading={isLoadingBookings}
                    />
                  </div>
                ) : (
                  <>
                    {/* Cards Grid */}
                    {filteredCourts.length === 0 ? (
                      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 max-w-md mx-auto">
                        <Activity className="w-8 h-8 text-[#1b7a42] mx-auto mb-2" />
                        <h3 className="font-bold text-slate-800 text-sm">Không tìm thấy sân phù hợp</h3>
                        <p className="text-xs text-slate-500 mt-1 mb-4">
                          Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem tất cả sân.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('')
                            setCriteria(defaultCriteria)
                            setActiveTab('all')
                          }}
                          className="px-4 py-2 rounded-xl bg-[#1b7a42] hover:bg-[#156335] text-white text-xs font-bold cursor-pointer transition-colors"
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
                            onBook={(c) => handleOpenBooking(c)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* View 2: Khám phá */}
            {currentView === 'khampha' && (
              <KhamPhaView
                onBookCourt={(court) => handleOpenBooking(court)}
                onOpenAIChat={() => setIsAIChatOpen(true)}
              />
            )}

            {/* View 3: Nổi bật */}
            {currentView === 'trending' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                        onBook={(c) => handleOpenBooking(c)}
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

      {/* Modals */}

      {/* TV3 Interactive Court Booking Modal (Timeline slot grid & 10-minute hold reservation) */}
      {bookingCourtInfo && (
        <CourtBookingModal
          isOpen={!!bookingCourtInfo}
          courtId={bookingCourtInfo.courtId}
          courtName={bookingCourtInfo.courtName}
          facilityName={bookingCourtInfo.facilityName}
          facilityAddress={bookingCourtInfo.facilityAddress}
          onClose={() => setBookingCourtInfo(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  )
}

export default App
