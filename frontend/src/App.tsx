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
import { Activity, Flame, CalendarCheck } from 'lucide-react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { Header } from './components/shared/Header'
import { GlobalLoadingScreen } from './components/shared/GlobalLoadingScreen'
import { TopLoadingBar } from './components/shared/TopLoadingBar'
import { CourtSearchBar } from './components/shared/CourtSearchBar'
import { CourtCardItem } from './modules/user/ai-search/CourtCardItem'
import { SmartFilterModal } from './modules/user/ai-search/SmartFilterModal'
import { AIChatPanel } from './modules/user/ai-search/AIChatPanel'
import { CourtContactModal } from './components/shared/CourtContactModal'
import { CourtBookingModal } from './modules/booking/components/CourtBookingModal'
import { courtApi, facilityToCourtItem } from './modules/court/services/courtApi'
import { AuthModal } from './modules/user/auth/AuthModal'
import { authApi, authStorage } from './modules/user/auth/authApi'
import { ProfileModal } from './modules/user/profile/ProfileModal'
import { BottomNav } from './components/shared/BottomNav'
import { KhamPhaView } from './modules/user/ai-search/KhamPhaView'
import { CourtMapView } from './modules/court/search/CourtMapView'
import { AccountView } from './modules/user/account/AccountView'
import { CourtDetailView } from './modules/court/facility/CourtDetailView'
import { CourtDetailSidebar } from './modules/court/facility/CourtDetailSidebar'
import { CourtBookingGridView } from './modules/booking/availability/CourtBookingGridView'
import { CheckoutView } from './modules/booking/payment/CheckoutView'
import { BookingSuccessView } from './modules/booking/payment/BookingSuccessView'
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

// TV3 Booking & Payment components
import { MyBookingsList } from './modules/booking/components/MyBookingsList'
import { PaymentCheckoutModal } from './modules/booking/components/PaymentCheckoutModal'
import { bookingApi } from './modules/booking/services/bookingApi'
import type { BookingResponse, TimeSlot } from './modules/booking/types'

import { defaultCriteria } from './modules/user/ai-search/searchDefaults'
import type { BadmintonCourtItem } from './modules/types/court'
import type { User, NotificationItem, CourtResult, SearchCriteria } from './modules/types/user'

const NAV_TAB_INDEX: Record<MainNavTab, number> = {
  home: 0,
  map: 1,
  khampha: 2,
  trending: 3,
  account: 4,
}

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
  const [authLoading, setAuthLoading] = useState(() => !!authStorage.getToken())
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
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
        .finally(() => setAuthLoading(false))
    }
  }, [])

  const handleLogout = () => {
    authStorage.removeToken()
    setCurrentUser(null)
    setBookingCourt(null)
    setCheckoutBooking(null)
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
  const [bookingCourt, setBookingCourt] = useState<{
    courtId: number
    courtName: string
    facilityName: string
    facilityAddress?: string
    initialDate: string
    initialSlot: TimeSlot
  } | null>(null)
  const [selectedCourtForSidebar, setSelectedCourtForSidebar] = useState<BadmintonCourtItem | null>(null)
  const [isCourtSidebarOpen, setIsCourtSidebarOpen] = useState(false)
  const [isCourtContactOpen, setIsCourtContactOpen] = useState(false)
  const [contactTargetCourt, setContactTargetCourt] = useState<BadmintonCourtItem | null>(null)

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

  // Booking Checkout Modal State (TV3)
  const [checkoutBooking, setCheckoutBooking] = useState<BookingResponse | null>(null)

  // Query My Bookings (TV3 Real Data)
  const { data: myBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['myBookings', currentUser?.id],
    queryFn: () => bookingApi.getMyBookings(),
    enabled: !!currentUser,
  })

  // Mutation Hủy đơn (TV3)
  const cancelBookingMutation = useMutation({
    mutationFn: (id: number) => bookingApi.cancelBooking(id),
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

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['facilityFavorites', currentUser?.id],
    queryFn: courtApi.getFavorites,
    enabled: !!currentUser,
  })
  const favoriteMutation = useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => courtApi.setFavorite(id, favorite),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facilityFavorites', currentUser?.id] }),
    onError: (error) => toast.error(error.message),
  })
  const handleToggleFavorite = (id: string) => {
    if (!currentUser) {
      setAuthInitialTab('login')
      setIsAuthOpen(true)
      return
    }
    favoriteMutation.mutate({ id, favorite: !favoriteIds.includes(id) })
  }

  const { data: allFacilities } = useQuery({
    queryKey: ['publicFacilities'],
    enabled: !isManagementRoute,
    queryFn: () => courtApi.searchFacilities(),
  })
  const { data: filteredFacilities, isLoading: courtsLoading, isError: courtsError } = useQuery({
    queryKey: ['publicFacilities', searchTerm, criteria.district, criteria.maxPricePerHour, criteria.amenities],
    enabled: !isManagementRoute,
    queryFn: () => courtApi.searchFacilities({
      keyword: searchTerm.trim() || undefined,
      district: criteria.district || undefined,
      maxPrice: criteria.maxPricePerHour || undefined,
      amenities: criteria.amenities,
    }),
  })
  const courts = useMemo(() => (allFacilities ?? []).map((facility) => ({
    ...facilityToCourtItem(facility),
    isFavorite: favoriteIds.includes(facility.id),
  })), [allFacilities, favoriteIds])
  const filteredCourts = useMemo(() => (filteredFacilities ?? []).map((facility) => ({
    ...facilityToCourtItem(facility),
    isFavorite: favoriteIds.includes(facility.id),
  })).filter((court) => activeTab !== 'favorite' || court.isFavorite), [filteredFacilities, favoriteIds, activeTab])

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

  const openBookingForCourt = (court: NonNullable<typeof bookingCourt>) => {
    if (!currentUser) {
      setAuthInitialTab('login')
      setIsAuthOpen(true)
      return
    }
    setBookingCourt(court)
  }

  const handleOpenBooking = (court: BadmintonCourtItem | CourtResult) => {
    navigate(`/courts/${'facilityId' in court ? court.facilityId : court.id}/book`)
  }

  const handleBookingSuccess = (booking: BookingResponse) => {
    toast.success('Đã giữ chỗ sân', {
      description: `Mã đơn #SMC-${booking.id}. Bạn có thể xem lại trong mục Sân đã đặt.`,
      action: { label: 'Xem đơn', onClick: () => navigate(`/checkout/${booking.id}`) },
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
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1b7a42] flex items-center justify-center font-bold">
                <CalendarCheck className="w-5 h-5 text-[#1b7a42]" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Quản lý lịch đặt sân của bạn</h2>
                <p className="text-xs text-slate-600 font-medium">Xem các sân đang giữ chỗ (10 phút) và lịch chơi đã xác nhận</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.HOME)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-[#1b7a42] hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              ← Đặt thêm sân mới
            </button>
          </div>

          <MyBookingsList
            bookings={myBookings}
            onCancelBooking={(id) => cancelBookingMutation.mutate(id)}
            onPayBooking={(b) => setCheckoutBooking(b)}
            isLoading={isLoadingBookings}
          />
        </div>
      )}

      {activeTab === 'favorite' && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-900">
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
      {activeTab !== 'booked' && (
        filteredCourts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 max-w-md mx-auto">
            <Activity className="w-8 h-8 text-[#1b7a42] mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">{courtsLoading ? 'Đang tải danh sách sân' : courtsError ? 'Không thể tải danh sách sân' : 'Không tìm thấy sân phù hợp'}</h3>
            <p className="text-xs text-slate-600 font-medium mt-1 mb-4">
              {courtsError ? 'Vui lòng thử lại sau.' : 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem tất cả sân.'}
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
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )
      )}
    </div>
  )

  return (
    <div
      className={`min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900 ${
        activeNavTab === 'map'
          ? 'h-screen h-[100dvh] overflow-hidden p-0'
          : isManagementRoute || isCourtBookView
          ? 'min-h-screen pb-0'
          : 'pb-20'
      }`}
    >
      {/* Top progress bar khi chuyển tab hoặc fetch API */}
      <TopLoadingBar />

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
          onOpenOwnerChat={() => {
            setContactTargetCourt(null)
            setIsCourtContactOpen(true)
          }}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onMarkNotificationRead={handleMarkNotificationRead}
          onNavigateHome={() => navigate(ROUTES.HOME)}
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
              isManagementRoute ? '' : slideDirection === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
            }`}
          >
            <CourtMapView
              courts={courts.filter((c) => c.latitude !== 0 && c.longitude !== 0)}
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
              isManagementRoute ? '' : slideDirection === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
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
              isManagementRoute
                ? 'w-full max-w-full p-0'
                : isCourtBookView
                ? 'w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-3 space-y-4'
                : `max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 ${
                    showHeader ? 'pt-4 pb-6' : 'py-4 sm:py-6'
                  } space-y-4`
            } ${showBottomNav ? 'pb-28' : 'pb-8'} relative z-20 ${
              isManagementRoute ? '' : slideDirection === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
            }`}
          >
            <Routes>
              {/* Home & Sub-tab routes */}
              <Route path={ROUTES.HOME} element={renderHomeView()} />
              <Route path={ROUTES.FAVORITES} element={renderHomeView()} />
              <Route path="/home" element={<Navigate to={ROUTES.HOME} replace />} />
              <Route path="/favorite" element={<Navigate to={ROUTES.FAVORITES} replace />} />

              {/* Customer Booking Flow */}
              <Route path={ROUTES.COURT_DETAIL} element={<CourtDetailView favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} />} />
              <Route
                path={ROUTES.COURT_BOOK}
                element={
                  <CourtBookingGridView onBook={openBookingForCourt} currentUser={currentUser} onOpenAuth={(tab = 'login') => { setAuthInitialTab(tab); setIsAuthOpen(true) }} />
                }
              />
              <Route path={ROUTES.CHECKOUT} element={authLoading ? null : currentUser ? <CheckoutView userId={currentUser.id} /> : <Navigate to={ROUTES.ACCOUNT} replace />} />
              <Route path={ROUTES.BOOKING_SUCCESS} element={authLoading ? null : currentUser ? <BookingSuccessView userId={currentUser.id} /> : <Navigate to={ROUTES.ACCOUNT} replace />} />
              <Route path={ROUTES.BOOKED} element={currentUser ? <MyBookingsList bookings={myBookings} onCancelBooking={(id) => cancelBookingMutation.mutate(id)} onPayBooking={(b) => setCheckoutBooking(b)} isLoading={isLoadingBookings} /> : <Navigate to={ROUTES.ACCOUNT} replace />} />

              {/* Court Owner Portal */}
              <Route path={ROUTES.OWNER_DASHBOARD} element={authLoading ? null : currentUser && ['COURT_OWNER', 'SYSTEM_ADMIN'].includes(currentUser.role) ? <OwnerDashboardView /> : <Navigate to={ROUTES.ACCOUNT} replace />} />
              <Route path={ROUTES.OWNER_FACILITIES} element={authLoading ? null : currentUser && ['COURT_OWNER', 'SYSTEM_ADMIN'].includes(currentUser.role) ? <OwnerFacilitiesView /> : <Navigate to={ROUTES.ACCOUNT} replace />} />
              <Route path={ROUTES.OWNER_PRICING} element={authLoading ? null : currentUser && ['COURT_OWNER', 'SYSTEM_ADMIN'].includes(currentUser.role) ? <OwnerPricingView /> : <Navigate to={ROUTES.ACCOUNT} replace />} />
              <Route path={ROUTES.OWNER_BLOCKS} element={authLoading ? null : currentUser && ['COURT_OWNER', 'SYSTEM_ADMIN'].includes(currentUser.role) ? <OwnerBlocksView /> : <Navigate to={ROUTES.ACCOUNT} replace />} />
              <Route path={ROUTES.OWNER_BOOKINGS} element={authLoading ? null : currentUser && ['COURT_OWNER', 'SYSTEM_ADMIN'].includes(currentUser.role) ? <OwnerBookingsView /> : <Navigate to={ROUTES.ACCOUNT} replace />} />

              {/* System Admin Portal */}
              <Route path={ROUTES.ADMIN_PORTAL} element={authLoading ? null : currentUser?.role === 'SYSTEM_ADMIN' ? <AdminPortalView /> : <Navigate to={ROUTES.ACCOUNT} replace />} />

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
                    courts={courts}
                    onSelectCourt={handleOpenCourtSidebar}
                    onBookCourtDirect={handleOpenBooking}
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
                      {courts
                        .filter((c) => (c.rating || 0) >= 4.8)
                        .map((court, index) => (
                          <CourtCardItem
                            key={court.id}
                            court={court}
                            index={index}
                            onSelectCourt={handleOpenCourtSidebar}
                            onBook={handleOpenBooking}
                onToggleFavorite={handleToggleFavorite}
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
          onOpenAIChat={() => setIsAIChatOpen(prev => !prev)}
          isAIChatOpen={isAIChatOpen}
          isLoggedIn={!!currentUser}
        />
      )}

      {/* Modals */}

      {/* TV3 Payment Checkout Modal (payOS & Mock) */}
      {checkoutBooking && (
        <PaymentCheckoutModal
          isOpen={!!checkoutBooking}
          booking={checkoutBooking}
          onClose={() => setCheckoutBooking(null)}
          onPaymentSuccess={() => {
            qc.invalidateQueries({ queryKey: ['myBookings'] })
            qc.invalidateQueries({ queryKey: ['courtAvailability'] })
          }}
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

      {/* Court Detail Sidebar (Slide-in Drawer khi ấn vào sân) */}
      <CourtDetailSidebar
        court={selectedCourtForSidebar && {
          ...selectedCourtForSidebar,
          isFavorite: favoriteIds.includes(selectedCourtForSidebar.id),
        }}
        isOpen={isCourtSidebarOpen}
        onClose={handleCloseCourtSidebar}
        onBook={handleOpenBooking}
        onOpenAIChat={() => setIsAIChatOpen(true)}
        onOpenOwnerChat={(court) => {
          setContactTargetCourt(court)
          setIsCourtContactOpen(true)
        }}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Court Contact Modal (Nhắn tin với chủ sân qua Zalo, Messenger, Hotline) */}
      <CourtContactModal
        isOpen={isCourtContactOpen}
        onClose={() => setIsCourtContactOpen(false)}
        court={contactTargetCourt}
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

      {bookingCourt && currentUser && (
        <CourtBookingModal
          {...bookingCourt}
          isOpen
          onClose={() => setBookingCourt(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalLoadingScreen minDuration={900} />
      <MainApp />
    </QueryClientProvider>
  )
}

export default App
