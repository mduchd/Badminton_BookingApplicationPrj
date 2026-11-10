export const ROUTES = {
  HOME: '/',
  MAP: '/map',
  KHAM_PHA: '/khampha',
  EXPLORE: '/explore',
  TRENDING: '/trending',
  ACCOUNT: '/account',
  PROFILE: '/profile',
  BOOKED: '/booked',
  FAVORITES: '/favorites',
  // Customer Booking & Court Detail Flow
  COURT_DETAIL: '/courts/:id',
  COURT_BOOK: '/courts/:id/book',
  CHECKOUT: '/checkout/:bookingId',
  BOOKING_SUCCESS: '/booking-success/:bookingId',
  // Court Owner Portal
  OWNER_DASHBOARD: '/owner',
  OWNER_FACILITIES: '/owner/facilities',
  OWNER_PRICING: '/owner/pricing',
  OWNER_BLOCKS: '/owner/blocks',
  OWNER_BOOKINGS: '/owner/bookings',
  // System Admin Portal
  ADMIN_PORTAL: '/admin',
} as const

export type AppRoute = typeof ROUTES[keyof typeof ROUTES]

export type MainNavTab = 'home' | 'map' | 'khampha' | 'trending' | 'account'

export const getNavTabFromPath = (pathname: string): MainNavTab => {
  if (pathname === ROUTES.MAP || pathname.startsWith('/map/')) {
    return 'map'
  }
  if (
    pathname === ROUTES.KHAM_PHA ||
    pathname.startsWith('/khampha/') ||
    pathname === ROUTES.EXPLORE ||
    pathname.startsWith('/explore/')
  ) {
    return 'khampha'
  }
  if (pathname === ROUTES.TRENDING || pathname.startsWith('/trending/')) {
    return 'trending'
  }
  if (
    pathname === ROUTES.ACCOUNT ||
    pathname.startsWith('/account/') ||
    pathname === ROUTES.PROFILE ||
    pathname.startsWith('/profile/')
  ) {
    return 'account'
  }
  return 'home'
}

/**
 * Kiểm tra xem thanh Bottom Navigation (Dock nổi 5 tab) có nên hiển thị trên route hiện tại không.
 *
 * NGUYÊN TẮC THIẾT KẾ (Responsive & Overflow Safety):
 * - Chỉ hiển thị trên các màn hình duyệt/khám phá cấp cao (Top-level tabs): Trang chủ, Bản đồ, Khám phá, Nổi bật, Tài khoản, Sân đã đặt, Yêu thích.
 * - TỰ ĐỘNG TẮT ở các trang luồng sâu để tránh che lấp nội dung & nút bấm tương tác:
 *   1. /courts/:id/book -> Lưới ma trận chọn giờ (tránh che các hàng sân & thanh tính tiền cố định ở đáy)
 *   2. /checkout/:id -> Thanh toán payOS; chỉ xác nhận đặt sân sau webhook thành công
 *   3. /booking-success/:id -> Màn hình biên nhận thành công (đã có CTA Thêm lịch/Về trang chủ)
 *   4. /courts/:id -> Chi tiết cụm sân (tối ưu diện tích đọc thông tin & tập trung vào CTA Đặt sân)
 *   5. /owner/* -> Cụm trang quản trị Chủ sân (đã có hệ thống OwnerLayout riêng 5 tab)
 *   6. /admin/* -> Cụm trang Quản trị viên hệ thống (đã có Admin navigation riêng)
 */
export const isBottomNavVisible = (pathname: string): boolean => {
  // 1. Tắt ở toàn bộ luồng chi tiết cụm sân & chọn lịch đặt sân
  if (pathname.startsWith('/courts/')) {
    return false
  }

  // 2. Tắt ở luồng thanh toán đơn đặt sân
  if (pathname.startsWith('/checkout/')) {
    return false
  }

  // 3. Tắt ở màn hình xác nhận đặt sân thành công
  if (pathname.startsWith('/booking-success/')) {
    return false
  }

  // 4. Tắt ở toàn bộ phân hệ Quản trị Chủ sân (Court Owner Portal)
  if (pathname === ROUTES.OWNER_DASHBOARD || pathname.startsWith('/owner/')) {
    return false
  }

  // 5. Tắt ở phân hệ Quản trị viên hệ thống (Admin Portal)
  if (pathname === ROUTES.ADMIN_PORTAL || pathname.startsWith('/admin/')) {
    return false
  }

  return true
}

/**
 * Kiểm tra xem Header chính (SmashCourt logo, chuông thông báo, tài khoản/đăng nhập)
 * có nên hiển thị trên route hiện tại không.
 *
 * NGUYÊN TẮC THIẾT KẾ:
 * - Chỉ hiển thị trên Trang chủ (ROUTES.HOME, /home, ROUTES.FAVORITES, /favorites, /favorite)
 *   nơi Header làm nền cho thanh tìm kiếm nổi CourtSearchBar (-mt-6 sm:-mt-7).
 * - TẮT TOÀN BỘ ở các tab & trang chức năng khác để giải phóng không gian màn hình,
 *   tránh cảm giác chật chội, vướng mắt và không bị trùng lặp header:
 *   1. /courts/:id/book -> Lưới ma trận chọn giờ (tối đa chiều dọc xem bảng giờ)
 *   2. /courts/:id -> Chi tiết cụm sân (đã có top bar quay lại + nút đặt sân riêng)
 *   3. /khampha, /explore -> Khám phá buổi chơi (đã có header xanh riêng kèm pills)
 *   4. /trending -> Nổi bật (đã có banner nổi bật riêng)
 *   5. /map -> Bản đồ toàn màn hình
 *   6. /account, /profile -> Trang tài khoản / lịch sử
 *   7. /booked -> Lịch sử đơn đặt
 *   8. /checkout/:id, /booking-success/:id -> Luồng thanh toán & hoàn tất
 *   9. /owner/*, /admin/* -> Cụm trang quản trị
 */
export const isHeaderVisible = (pathname: string): boolean => {
  return (
    pathname === ROUTES.HOME ||
    pathname === '/home' ||
    pathname === ROUTES.FAVORITES ||
    pathname === '/favorites' ||
    pathname === '/favorite'
  )
}

