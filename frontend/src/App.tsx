import { errorMessage } from './lib/errors'
import { lazy, Suspense, useState, useMemo, useRef, useEffect } from 'react'
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
import { CourtListSkeleton } from './components/shared/CourtListSkeleton'
import { readHomeFacilityCache, writeHomeFacilityCache } from './lib/homeFacilityCache'
import { TopLoadingBar } from './components/shared/TopLoadingBar'
import { CourtSearchBar } from './components/shared/CourtSearchBar'
import { Pagination } from './components/shared/Pagination'
import { CourtCardItem } from './modules/user/ai-search/CourtCardItem'
import { courtApi, facilityToCourtItem } from './modules/court/services/courtApi'
import { authApi, authStorage } from './modules/user/auth/authApi'
import { BottomNav } from './components/shared/BottomNav'
import {
  ROUTES,
  getNavTabFromPath,
  isBottomNavVisible,
  isHeaderVisible,
  type MainNavTab,
} from './app/router'

// TV3 Booking & Payment components
import type { BookingResponse, TimeSlot } from './modules/booking/types'

import { defaultCriteria } from './modules/user/ai-search/searchDefaults'
import type { BadmintonCourtItem } from './modules/types/court'
import type { User, NotificationItem, CourtResult, SearchCriteria } from './modules/types/user'

const SmartFilterModal = lazy(() => import('./modules/user/ai-search/SmartFilterModal').then((module) => ({ default: module.SmartFilterModal })))
const AIChatPanel = lazy(() => import('./modules/user/ai-search/AIChatPanel').then((module) => ({ default: module.AIChatPanel })))
const CourtContactModal = lazy(() => import('./components/shared/CourtContactModal').then((module) => ({ default: module.CourtContactModal })))
const CourtBookingModal = lazy(() => import('./modules/booking/components/CourtBookingModal').then((module) => ({ default: module.CourtBookingModal })))
const PasswordRecovery = lazy(() => import('./modules/user/auth/PasswordRecovery').then(m => ({ default: m.PasswordRecovery })))
const AuthModal = lazy(() => import('./modules/user/auth/AuthModal').then((module) => ({ default: module.AuthModal })))
const ProfileModal = lazy(() => import('./modules/user/profile/ProfileModal').then((module) => ({ default: module.ProfileModal })))
const KhamPhaView = lazy(() => import('./modules/user/ai-search/KhamPhaView').then((module) => ({ default: module.KhamPhaView })))
const CourtMapView = lazy(() => import('./modules/court/search/CourtMapView').then((module) => ({ default: module.CourtMapView })))
const AccountView = lazy(() => import('./modules/user/account/AccountView').then((module) => ({ default: module.AccountView })))
const CourtDetailView = lazy(() => import('./modules/court/facility/CourtDetailView').then((module) => ({ default: module.CourtDetailView })))
const CourtDetailSidebar = lazy(() => import('./modules/court/facility/CourtDetailSidebar').then((module) => ({ default: module.CourtDetailSidebar })))
const CourtBookingGridView = lazy(() => import('./modules/booking/availability/CourtBookingGridView').then((module) => ({ default: module.CourtBookingGridView })))
const CheckoutView = lazy(() => import('./modules/booking/payment/CheckoutView').then((module) => ({ default: module.CheckoutView })))
const BookingSuccessView = lazy(() => import('./modules/booking/payment/BookingSuccessView').then((module) => ({ default: module.BookingSuccessView })))
const OwnerDashboardView = lazy(() => import('./modules/court/management/OwnerDashboardView').then((module) => ({ default: module.OwnerDashboardView })))
const OwnerFacilitiesView = lazy(() => import('./modules/court/management/OwnerFacilitiesView').then((module) => ({ default: module.OwnerFacilitiesView })))
const OwnerPricingView = lazy(() => import('./modules/court/pricing/OwnerPricingView').then((module) => ({ default: module.OwnerPricingView })))
const OwnerBlocksView = lazy(() => import('./modules/court/management/OwnerBlocksView').then((module) => ({ default: module.OwnerBlocksView })))
const OwnerBookingsView = lazy(() => import('./modules/court/management/OwnerBookingsView').then((module) => ({ default: module.OwnerBookingsView })))
const AdminPortalView = lazy(() => import('./modules/user/admin/AdminPortalView').then((module) => ({ default: module.AdminPortalView })))
const MyBookingsList = lazy(() => import('./modules/booking/components/MyBookingsList').then((module) => ({ default: module.MyBookingsList })))
const PaymentCheckoutModal = lazy(() => import('./modules/booking/components/PaymentCheckoutModal').then((module) => ({ default: module.PaymentCheckoutModal })))

function DeferredLoading() {
  return <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">Đang mở...</div>
}

function LoadOnOpen({ open, children }: { open: boolean; children: React.ReactNode }) {
  const [hasOpened, setHasOpened] = useState(open)
  if (open && !hasOpened) setHasOpened(true)
  return hasOpened || open ? children : null
}

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [resetToken, setResetToken] = useState(() => searchParams.get('reset_token'))
  useEffect(() => {
    if (searchParams.has('reset_token')) setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('reset_token'); return next }, { replace: true })
  }, [searchParams, setSearchParams])


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
  const [courtPagination, setCourtPagination] = useState({ key: '', page: 0 })

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
    const logoutToken = authStorage.getToken()
    void import('./modules/user/notification/pushClient').then(async ({ detachPushOnLogout }) => {
      if (logoutToken) await detachPushOnLogout(logoutToken)
    }).catch(() => {})
    authStorage.removeToken()
    qc.clear()
    setCurrentUser(null)
    setBookingCourt(null)
    setCheckoutBooking(null)
    toast.info('Đã đăng xuất khỏi hệ thống SmashCourt')
  }

  useEffect(() => {
    if (!currentUser || !('serviceWorker' in navigator)) return
    const onPush = (event: MessageEvent) => {
      if (event.data?.type !== 'smashcourt-push') return
      toast.info('Lịch đặt sân đã cập nhật', { description: 'Mở Tài khoản để xem trạng thái đơn.' })
      void qc.invalidateQueries({ queryKey: ['myBookings'] })
    }
    navigator.serviceWorker.addEventListener('message', onPush)
    return () => navigator.serviceWorker.removeEventListener('message', onPush)
  }, [currentUser, qc])

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

  if (isManagementRoute && isAIChatOpen) setIsAIChatOpen(false)

  const handleOpenCourtSidebar = (court: BadmintonCourtItem) => {
    setSelectedCourtForSidebar(court)
    setIsCourtSidebarOpen(true)
  }

  const handleCloseCourtSidebar = () => {
    setIsCourtSidebarOpen(false)
  }

  // Booking Checkout Modal State (TV3)
  const [checkoutBooking, setCheckoutBooking] = useState<BookingResponse | null>(null)

  // Query My Bookings (TV3 Real Data)
  const { data: myBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['myBookings', currentUser?.id],
    queryFn: () => import('./modules/booking/services/bookingApi').then(({ bookingApi }) => bookingApi.getMyBookings()),
    enabled: !!currentUser && (location.pathname === ROUTES.BOOKED || activeTab === 'booked'),
  })

  // Mutation Hủy đơn (TV3)
  const cancelBookingMutation = useMutation({
    mutationFn: (id: number) => import('./modules/booking/services/bookingApi').then(({ bookingApi }) => bookingApi.cancelBooking(id)),
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ['myBookings'] })
      qc.invalidateQueries({ queryKey: ['courtAvailability'] })
      toast.success('Hủy đặt chỗ thành công!', {
        description: `Đơn #SMC-${b.id} đã được hủy và khung giờ đã được giải phóng.`,
      })
    },
    onError: (err: unknown) => {
      toast.error('Hủy đơn không thành công', {
        description: errorMessage(err),
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
    enabled: !isManagementRoute && (activeNavTab === 'map' || location.pathname === ROUTES.TRENDING),
    queryFn: () => courtApi.searchFacilities(),
  })
  const courtPageKey = JSON.stringify([searchTerm, criteria, activeTab, activeTab === 'favorite' ? favoriteIds : null])
  const currentCourtPage = courtPagination.key === courtPageKey ? courtPagination.page : 0
  const isDefaultHomePage = activeTab === 'all' && currentCourtPage === 0 && !searchTerm.trim() && !criteria.district && !criteria.maxPricePerHour && !criteria.amenities?.length
  const cachedHomePage = isDefaultHomePage ? readHomeFacilityCache() : undefined
  const { data: filteredFacilities, isLoading: courtsLoading, isError: courtsError, refetch: refetchCourts } = useQuery({
    queryKey: ['publicFacilitiesPage', courtPageKey, currentCourtPage],
    enabled: !isManagementRoute && (location.pathname === ROUTES.HOME || location.pathname === ROUTES.FAVORITES) && (activeTab !== 'favorite' || favoriteIds.length > 0),
    initialData: cachedHomePage?.data,
    initialDataUpdatedAt: cachedHomePage?.savedAt,
    queryFn: async () => {
      const result = await courtApi.searchFacilitiesPage({
        keyword: searchTerm.trim() || undefined,
        district: criteria.district || undefined,
        maxPrice: criteria.maxPricePerHour || undefined,
        amenities: criteria.amenities,
        ids: activeTab === 'favorite' ? favoriteIds : undefined,
        page: currentCourtPage,
      })
      if (isDefaultHomePage) writeHomeFacilityCache(result)
      return result
    },
  })
  const courts = useMemo(() => (allFacilities ?? []).map((facility) => ({
    ...facilityToCourtItem(facility),
    isFavorite: favoriteIds.includes(facility.id),
  })), [allFacilities, favoriteIds])
  const filteredCourts = useMemo(() => (filteredFacilities?.content ?? []).map((facility) => ({
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
    setBookingCourt(court)
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
    toast.success('Đã giữ chỗ sân')
    navigate(`/checkout/${booking.id}`)
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
        courtsLoading ? <CourtListSkeleton /> : filteredCourts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 max-w-md mx-auto">
            <Activity className="w-8 h-8 text-[#1b7a42] mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">{courtsError ? 'Không thể tải danh sách sân' : 'Không tìm thấy sân phù hợp'}</h3>
            <p className="text-xs text-slate-600 font-medium mt-1 mb-4">
              {courtsError ? 'Vui lòng thử lại sau.' : 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem tất cả sân.'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (courtsError) { void refetchCourts(); return }
                setSearchTerm('')
                setCriteria(defaultCriteria)
                navigate(ROUTES.HOME)
              }}
              className="px-4 py-2 rounded-xl bg-[#1b7a42] text-white text-xs font-bold cursor-pointer hover:bg-[#156335] transition-colors"
            >
              {courtsError ? 'Thử lại' : 'Xem tất cả sân'}
            </button>
          </div>
        ) : (
          <div>
          {courtsError && <p role="status" className="mb-3 text-sm text-slate-600">Không thể cập nhật danh sách. Đang hiển thị dữ liệu đã lưu.</p>}
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
          <Pagination page={currentCourtPage} pageSize={24} total={filteredFacilities?.totalElements ?? 0} onChange={(page) => setCourtPagination({ key: courtPageKey, page })} />
          </div>
        )
      )}
    </div>
  )

  if (authLoading && !isManagementRoute) {
    return <p className="p-6 text-center text-slate-600" role="status">Đang xác thực tài khoản…</p>
  }
  if (currentUser?.role === 'SYSTEM_ADMIN' && !location.pathname.startsWith('/admin')) {
    return <Navigate to={ROUTES.ADMIN_PORTAL} replace />
  }
  if (currentUser?.role === 'COURT_OWNER' && !location.pathname.startsWith('/owner')) {
    return <Navigate to={ROUTES.OWNER_DASHBOARD} replace />
  }

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
            <Suspense fallback={<CourtListSkeleton />}><Routes>
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
            </Routes></Suspense>
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
              isManagementRoute || isCourtBookView ? '' : slideDirection === 'right' ? 'tab-slide-from-right' : 'tab-slide-from-left'
            }`}
          >
            <Suspense fallback={<CourtListSkeleton />}><Routes>
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
            </Routes></Suspense>
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
      <Suspense fallback={<DeferredLoading />}>

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
      {isFilterModalOpen && <Suspense fallback={<DeferredLoading />}>
      <SmartFilterModal
        isOpen={isFilterModalOpen}
        criteria={criteria}
        onClose={() => setIsFilterModalOpen(false)}
        onChangeCriteria={setCriteria}
        onApply={() => toast.success('Đã áp dụng bộ lọc')}
        onReset={() => {
          setCriteria(defaultCriteria)
          toast.info('Đã đặt lại bộ lọc')
        }}
      />
      </Suspense>}

      {/* Court Detail Sidebar (Slide-in Drawer khi ấn vào sân) */}
      <LoadOnOpen open={isCourtSidebarOpen}><CourtDetailSidebar
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

      </LoadOnOpen>

      {/* Court Contact Modal (Nhắn tin với chủ sân qua Zalo, Messenger, Hotline) */}
      {isCourtContactOpen && <Suspense fallback={<DeferredLoading />}>
      <CourtContactModal
        isOpen={isCourtContactOpen}
        onClose={() => setIsCourtContactOpen(false)}
        court={contactTargetCourt}
      />
      </Suspense>}

      {/* AI Court Finder Chat Panel (Spring AI Orchestrator) - Tuyệt đối không xuất hiện trên Chủ sân & Admin */}
      {!isManagementRoute && (
        <LoadOnOpen open={isAIChatOpen}><AIChatPanel
          isOpen={isAIChatOpen && !isManagementRoute}
          onClose={() => setIsAIChatOpen(false)}
          onApplyCriteria={handleApplyCriteriaFromAI}
          onSelectCourt={handleOpenCourtSidebar}
          onBookCourt={handleOpenBooking}
          onChooseRecommendation={(court) => {
            if (!court.courtId || !court.date || !court.startTime || !court.endTime || court.totalPrice == null) return
            setIsAIChatOpen(false)
            openBookingForCourt({ courtId: court.courtId, courtName: court.courtName || 'Sân đã chọn', facilityName: court.facilityName,
              facilityAddress: court.address, initialDate: court.date,
              initialSlot: { startTime: court.startTime, endTime: court.endTime, price: court.totalPrice, available: true, slotStatus: 'AVAILABLE' } })
          }}
          onOpenFacilityBooking={(facilityId) => {
            setIsAIChatOpen(false)
            navigate(`/courts/${facilityId}/book`)
          }}
          currentCriteria={criteria}
        /></LoadOnOpen>
      )}

      {bookingCourt && currentUser && (
        <CourtBookingModal
          {...bookingCourt}
          isOpen
          onClose={() => setBookingCourt(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {resetToken && <PasswordRecovery token={resetToken} onClose={() => setResetToken(null)} onReset={() => setCurrentUser(null)} />}
      {/* Auth Modal (Login / Register / Google OIDC) */}
      {isAuthOpen && <Suspense fallback={<DeferredLoading />}>
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authInitialTab}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user)
          setIsAuthOpen(false)
          if (user.role === 'SYSTEM_ADMIN') {
            navigate(ROUTES.ADMIN_PORTAL, { replace: true })
          }
        }}
      />
      </Suspense>}

      {/* Profile Modal (FCM Web Push & Google Calendar Sync) */}
      {currentUser && isProfileOpen && (
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
      </Suspense>
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
