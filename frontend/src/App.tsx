import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { Activity, Flame } from 'lucide-react'
import { Header } from './components/shared/Header'
import { CourtSearchBar } from './components/shared/CourtSearchBar'
import { CourtCardItem } from './modules/user/ai-search/CourtCardItem'
import { SmartFilterModal } from './modules/user/ai-search/SmartFilterModal'
import { AIChatPanel } from './modules/user/ai-search/AIChatPanel'
import { AuthModal } from './modules/user/auth/AuthModal'
import { authApi, authStorage } from './modules/user/auth/authApi'
import { ProfileModal } from './modules/user/profile/ProfileModal'
import { BookingConfirmModal } from './modules/user/ai-search/BookingConfirmModal'
import { BottomNav } from './components/shared/BottomNav'
import { KhamPhaView } from './modules/user/ai-search/KhamPhaView'
import { CourtMapView } from './modules/court/search/CourtMapView'
import { AccountView } from './modules/user/account/AccountView'
import { CourtDetailView } from './modules/court/facility/CourtDetailView'
import { CourtDetailSidebar } from './modules/court/facility/CourtDetailSidebar'
import { CourtBookingGridView } from './modules/booking/availability/CourtBookingGridView'
import { CheckoutView } from './modules/booking/payment/CheckoutView'
import { BookingSuccessView } from './modules/booking/payment/BookingSuccessView'
import { BookingHistoryView } from './modules/booking/history/BookingHistoryView'
import { OwnerDashboardView } from './modules/court/management/OwnerDashboardView'
import { OwnerFacilitiesView } from './modules/court/management/OwnerFacilitiesView'
import { OwnerPricingView } from './modules/court/pricing/OwnerPricingView'
import { OwnerBlocksView } from './modules/court/management/OwnerBlocksView'
import { OwnerBookingsView } from './modules/court/management/OwnerBookingsView'
import { AdminPortalView } from './modules/user/admin/AdminPortalView'
import {
  ROUTES,
  getNavTabFromPath,
  isBottomNavVisible,
  isHeaderVisible,
  type MainNavTab,
} from './app/router'
import {
  mockNotifications,
  mockBadmintonCourts,
  defaultCriteria,
  type BadmintonCourtItem,
} from './modules/user/mockData'
import type { User, NotificationItem, CourtResult, SearchCriteria } from './modules/types/user'

const NAV_TAB_INDEX: Record<MainNavTab, number> = {
  home: 0,
  map: 1,
  khampha: 2,
  trending: 3,
  account: 4,
}

export function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const activeNavTab = getNavTabFromPath(location.pathname)
  const showBottomNav = isBottomNavVisible(location.pathname)
  const showHeader = isHeaderVisible(location.pathname)
  const isManagementRoute = location.pathname.startsWith('/owner') || location.pathname.startsWith('/admin')
  const isCourtBookView = location.pathname.includes('/book')
  const prevTabRef = useRef<MainNavTab>(activeNavTab)
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right')

  useEffect(() => {
    if (prevTabRef.current !== activeNavTab) {
      const oldIdx = NAV_TAB_INDEX[prevTabRef.current]
      const newIdx = NAV_TAB_INDEX[activeNavTab]
      setSlideDirection(newIdx >= oldIdx ? 'right' : 'left')
      prevTabRef.current = activeNavTab
    }
  }, [activeNavTab])

  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications)
  const [criteria, setCriteria] = useState<SearchCriteria>(defaultCriteria)
  const [searchTerm, setSearchTerm] = useState('')

  // Verify and restore authenticated session on load
  useEffect(() => {
    const token = authStorage.getToken()
    if (token) {
      authApi
        .getMe()
        .then((user) => {
          if (user) {
            setCurrentUser(user)
          }
        })
        .catch(() => {
          authStorage.removeToken()
        })
    }
  }, [])

  const handleLogout = () => {
    authStorage.removeToken()
    setCurrentUser(null)
    toast.info('Đã đăng xuất khỏi hệ thống SmashCourt')
  }

  // Sub-tab state for Home view (All / Booked / Favorites)
  const activeTab: 'all' | 'map' | 'booked' | 'favorite' = useMemo(() => {
    if (location.pathname === ROUTES.BOOKED) return 'booked'
    if (location.pathname === ROUTES.FAVORITES || location.pathname === '/favorite') return 'favorite'
    const tabParam = searchParams.get('tab')
    if (tabParam === 'booked') return 'booked'
    if (tabParam === 'favorite' || tabParam === 'favorites') return 'favorite'
    return 'all'
  }, [location.pathname, searchParams])

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [bookingCourt, setBookingCourt] = useState<CourtResult | null>(null)
  const [selectedCourtForSidebar, setSelectedCourtForSidebar] = useState<BadmintonCourtItem | null>(null)
  const [isCourtSidebarOpen, setIsCourtSidebarOpen] = useState(false)

  const handleOpenCourtSidebar = (court: BadmintonCourtItem) => {
    setSelectedCourtForSidebar(court)
    setIsCourtSidebarOpen(true)
  }

  const handleCloseCourtSidebar = () => {
    setIsCourtSidebarOpen(false)
  }

  // Auto close AI Chat when entering management routes (Owner & Admin)
  useEffect(() => {
    if (isManagementRoute && isAIChatOpen) {
      setIsAIChatOpen(false)
    }
  }, [isManagementRoute, isAIChatOpen])

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
      if (activeTab === 'booked' && court.id !== 'court_1' && court.id !== 'court_2') {
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

  // Handle BottomNav navigation
  const handleSelectNavTab = (tab: MainNavTab) => {
    switch (tab) {
      case 'home':
        navigate(ROUTES.HOME)
        break
      case 'map':
        navigate(ROUTES.MAP)
        break
      case 'khampha':
        navigate(ROUTES.KHAM_PHA)
        break
      case 'trending':
        navigate(ROUTES.TRENDING)
        break
      case 'account':
        navigate(ROUTES.ACCOUNT)
        break
    }
  }

  // Handle Home sub-tabs (All / Map / Booked / Favorite)
  const handleSelectCourtTab = (tab: 'all' | 'map' | 'booked' | 'favorite') => {
    if (tab === 'map') {
      navigate(ROUTES.MAP)
    } else if (tab === 'booked') {
      if (activeTab === 'booked') {
        navigate(ROUTES.HOME)
      } else {
        navigate(ROUTES.BOOKED)
      }
    } else if (tab === 'favorite') {
      if (activeTab === 'favorite') {
        navigate(ROUTES.HOME)
      } else {
        navigate(ROUTES.FAVORITES)
      }
    } else {
      navigate(ROUTES.HOME)
    }
  }

  // Home view JSX renderer
  const renderHomeView = () => (
    <div className="space-y-4">
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

      {/* Sub-tab active banner (if on Booked or Favorites) */}
      {activeTab === 'booked' && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-xs text-emerald-800">
          <span className="font-semibold">Đang lọc: Danh sách sân đã đặt</span>
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
            className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
          >
            Xem tất cả
          </button>
        </div>
      )}
      {activeTab === 'favorite' && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-800">
          <span className="font-semibold">Đang lọc: Sân yêu thích của bạn</span>
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
            className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
          >
            Xem tất cả
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
            type="button"
            onClick={() => {
              setSearchTerm('')
              setCriteria(defaultCriteria)
              navigate(ROUTES.HOME)
            }}
            className="px-4 py-2 rounded-xl bg-[#1b7a42] text-white text-xs font-bold cursor-pointer hover:bg-[#156335] transition-colors"
          >
            Xem tất cả sân
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredCourts.map((court, index) => (
            <CourtCardItem
              key={court.id}
              court={court}
              index={index}
              onSelectCourt={handleOpenCourtSidebar}
              onBook={handleOpenBooking}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#f8fafc] font-sans text-slate-900 w-full max-w-full overflow-x-hidden ${
        activeNavTab === 'map'
          ? 'h-screen overflow-hidden pb-0'
          : activeNavTab === 'account'
          ? 'min-h-screen pb-16 lg:pb-0'
          : !showBottomNav
          ? 'min-h-screen pb-0'
          : 'pb-20'
      }`}
    >
      {/* Toast notifications */}
      <Toaster richColors position="top-right" closeButton />

      {/* 1. Header with custom SmashCourt brand (chỉ hiển thị ở Trang chủ để tối ưu không gian các tab và màn hình đặt sân) */}
      {showHeader && (
        <Header
          isHome={true}
          currentUser={currentUser}
          notifications={notifications}
          onOpenAuth={(tab = 'login') => {
            setAuthInitialTab(tab)
            setIsAuthOpen(true)
          }}
          onOpenProfile={() => navigate(ROUTES.ACCOUNT)}
          onOpenAIChat={() => setIsAIChatOpen(true)}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onMarkNotificationRead={handleMarkNotificationRead}
          onSimulateNewNotification={handleSimulateNewNotification}
          onNavigateHome={() => navigate(ROUTES.HOME)}
          hideAIChat={isManagementRoute}
        />
      )}

      {/* 2. Overlapping Floating Search Bar (Home view only, fully overlays on top of Header) */}
      {showHeader && (
        <div className="relative z-40 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-7">
          <CourtSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onOpenFilter={() => setIsFilterModalOpen(true)}
            onOpenSocial={() => navigate(ROUTES.KHAM_PHA)}
            onSelectTab={handleSelectCourtTab}
            activeTab={activeTab}
            activeFilterCount={activeFilterCount}
          />
        </div>
      )}

      {/* Main Container with Horizontal Slide Animation */}
      <div className={`flex-1 w-full max-w-full overflow-x-hidden relative z-20 ${activeNavTab === 'map' ? 'h-screen h-[100dvh]' : ''}`}>
        {activeNavTab === 'map' ? (
          <main
            key="map"
            className={`w-full max-w-full h-screen h-[100dvh] overflow-hidden ${
              slideDirection === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
            }`}
          >
            <CourtMapView
              courts={mockBadmintonCourts}
              onSelectCourt={handleOpenCourtSidebar}
              onBookCourt={handleOpenBooking}
              onOpenAIChat={() => setIsAIChatOpen(true)}
              onSwitchToList={() => navigate(ROUTES.HOME)}
            />
          </main>
        ) : activeNavTab === 'account' ? (
          <main
            key="account"
            className={`w-full max-w-full overflow-x-hidden min-h-[calc(100vh-64px)] ${
              slideDirection === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
            }`}
          >
            <Routes>
              {/* View 4: Tài khoản (Edge-to-edge full width, không Header) */}
              <Route
                path={`${ROUTES.ACCOUNT}/*`}
                element={
                  <AccountView
                    currentUser={currentUser}
                    onOpenAuth={(tab = 'login') => {
                      setAuthInitialTab(tab)
                      setIsAuthOpen(true)
                    }}
                    onUpdateUser={(updated) => setCurrentUser(updated)}
                    onLogout={handleLogout}
                    onNavigateHome={() => navigate(ROUTES.HOME)}
                  />
                }
              />
              <Route path={ROUTES.PROFILE} element={<Navigate to={ROUTES.ACCOUNT} replace />} />
              <Route path="*" element={<Navigate to={ROUTES.ACCOUNT} replace />} />
            </Routes>
          </main>
        ) : (
          <main
            key={activeNavTab + (showHeader ? '-home' : '-sub')}
            className={`${
              isCourtBookView
                ? 'w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-3'
                : `max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 ${
                    showHeader ? 'pt-4 pb-6' : 'py-4 sm:py-6'
                  }`
            } space-y-4 ${showBottomNav ? 'pb-28' : 'pb-8'} relative z-20 ${
              slideDirection === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
            }`}
          >
            <Routes>
              {/* Home & Sub-tab routes */}
              <Route path={ROUTES.HOME} element={renderHomeView()} />
              <Route path={ROUTES.FAVORITES} element={renderHomeView()} />
              <Route path="/home" element={<Navigate to={ROUTES.HOME} replace />} />
              <Route path="/favorite" element={<Navigate to={ROUTES.FAVORITES} replace />} />

              {/* Customer Booking Flow */}
              <Route path={ROUTES.COURT_DETAIL} element={<CourtDetailView />} />
              <Route
                path={ROUTES.COURT_BOOK}
                element={
                  <CourtBookingGridView
                    currentUser={currentUser}
                    onOpenAuth={(tab = 'login') => {
                      setAuthInitialTab(tab)
                      setIsAuthOpen(true)
                    }}
                  />
                }
              />
              <Route path={ROUTES.CHECKOUT} element={<CheckoutView />} />
              <Route path={ROUTES.BOOKING_SUCCESS} element={<BookingSuccessView />} />
              <Route path={ROUTES.BOOKED} element={<BookingHistoryView />} />

              {/* Court Owner Portal */}
              <Route path={ROUTES.OWNER_DASHBOARD} element={<OwnerDashboardView />} />
              <Route path={ROUTES.OWNER_FACILITIES} element={<OwnerFacilitiesView />} />
              <Route path={ROUTES.OWNER_PRICING} element={<OwnerPricingView />} />
              <Route path={ROUTES.OWNER_BLOCKS} element={<OwnerBlocksView />} />
              <Route path={ROUTES.OWNER_BOOKINGS} element={<OwnerBookingsView />} />

              {/* System Admin Portal */}
              <Route path={ROUTES.ADMIN_PORTAL} element={<AdminPortalView />} />

              {/* View 2: Khám phá */}
              <Route
                path={ROUTES.KHAM_PHA}
                element={
                  <KhamPhaView
                    currentUser={currentUser}
                    onOpenAuth={(tab = 'login') => {
                      setAuthInitialTab(tab)
                      setIsAuthOpen(true)
                    }}
                    onBookCourt={(court) => setBookingCourt(court)}
                    onOpenAIChat={() => setIsAIChatOpen(true)}
                  />
                }
              />
              <Route path={ROUTES.EXPLORE} element={<Navigate to={ROUTES.KHAM_PHA} replace />} />

              {/* View 3: Nổi bật */}
              <Route
                path={ROUTES.TRENDING}
                element={
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-slate-200">
                      <div className="flex items-start gap-3">
                        <Flame className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Cơ sở & Buổi chơi nổi bật hôm nay
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                            Các cụm sân đạt đánh giá 4.8★ trở lên và các buổi chơi giao lưu đông thành viên nhất.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(ROUTES.HOME)}
                        className="self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-[#168039] transition-colors cursor-pointer"
                      >
                        Xem tất cả sân →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                      {mockBadmintonCourts
                        .filter((c) => (c.rating || 0) >= 4.8)
                        .map((court, index) => (
                          <CourtCardItem
                            key={court.id}
                            court={court}
                            index={index}
                            onSelectCourt={handleOpenCourtSidebar}
                            onBook={handleOpenBooking}
                          />
                        ))}
                    </div>
                  </div>
                }
              />

              {/* Catch all / 404 fallback */}
              <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
            </Routes>
          </main>
        )}
      </div>

      {/* 4. Bottom Navigation Bar (Ẩn ở các luồng chọn lịch đặt sân, thanh toán, quản trị chủ sân/admin) */}
      {showBottomNav && (
        <BottomNav
          activeTab={activeNavTab}
          onSelectTab={handleSelectNavTab}
          onOpenProfile={() => navigate(ROUTES.ACCOUNT)}
          onOpenAuth={() => {
            setAuthInitialTab('login')
            setIsAuthOpen(true)
          }}
          isLoggedIn={!!currentUser}
        />
      )}

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

      {/* Court Detail Sidebar (Slide-in Drawer khi ấn vào sân) */}
      <CourtDetailSidebar
        court={selectedCourtForSidebar}
        isOpen={isCourtSidebarOpen}
        onClose={handleCloseCourtSidebar}
        onBook={handleOpenBooking}
        onOpenAIChat={() => setIsAIChatOpen(true)}
        onToggleFavorite={(_courtId) => {
          // Sync favorite state if desired
        }}
      />

      {/* AI Court Finder Chat Panel (Spring AI Orchestrator) - Tuyệt đối không xuất hiện trên Chủ sân & Admin */}
      {!isManagementRoute && (
        <AIChatPanel
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
          onApplyCriteria={handleApplyCriteriaFromAI}
          onSelectCourt={handleOpenCourtSidebar}
          onBookCourt={handleOpenBooking}
          currentCriteria={criteria}
        />
      )}

      {/* Booking Confirm Modal (Holding HELD & TV3 Hand-off) */}
      <BookingConfirmModal
        isOpen={!!bookingCourt}
        court={bookingCourt}
        currentUser={currentUser}
        onOpenAuth={(tab = 'login') => {
          setAuthInitialTab(tab)
          setIsAuthOpen(true)
        }}
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
            handleLogout()
            setIsProfileOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default App
