import { test, expect, type Page } from '@playwright/test'

async function mockPaymentFlow(page: Page, role = 'CUSTOMER') {
  let paid = false
  const booking = {
    id: 123, customerId: 1, facilityId: 1, courtId: 1,
    facilityName: 'Cụm sân kiểm thử', courtName: 'Sân 1',
    bookingDate: '2030-01-01', startTime: '12:00:00', endTime: '14:00:00',
    totalAmount: 180000, currency: 'VND', holdExpiresAt: '2030-01-01T01:10:00Z',
  }
  await page.clock.setFixedTime(new Date('2030-01-01T01:00:00Z'))
  await page.addInitScript(() => localStorage.setItem('smashcourt_auth_token', 'payment-flow-test'))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const envelope = (data: unknown) => ({ success: true, data })
    let data: unknown = []
    if (path.endsWith('/auth/me')) data = envelope({ id: 1, fullName: 'Người đặt sân', role })
    else if (path === '/api/bookings/123') data = envelope({ ...booking, status: paid ? 'CONFIRMED' : 'PENDING_PAYMENT' })
    else if (path === '/api/bookings/123/checkout') data = envelope({
      bookingId: 123, orderCode: 456, amount: 180000, paymentMethod: 'PAYOS',
      checkoutUrl: 'https://pay.payos.vn/web/test-payment', status: 'PENDING_PAYMENT',
    })
    else if (path === '/api/payments/booking/123') data = envelope({ status: paid ? 'SUCCESS' : 'PENDING', bookingId: 123, id: 1, amount: 180000 })
    else if (path === '/api/owner/bookings') data = [{ ...booking, status: 'PENDING_PAYMENT', bookingCode: 'SMC-123', customerName: 'Khách kiểm thử', customerPhone: '0900000000' }]
    await route.fulfill({ json: data })
  })
  return { confirmPayment: () => { paid = true } }
}

test('checkout opens payOS and confirms the booking only after payment succeeds', async ({ page }) => {
  const payment = await mockPaymentFlow(page)
  const checkout = page.waitForRequest(request => request.url().endsWith('/bookings/123/checkout'))
  await page.goto('/checkout/123')
  const modal = page.getByRole('dialog', { name: 'Thanh toán', exact: true })
  await expect(modal.getByRole('link', { name: 'Mở trang thanh toán payOS' })).toBeVisible()
  expect((await checkout).postDataJSON()).toEqual({
    paymentMethod: 'PAYOS',
    returnUrl: 'http://127.0.0.1:5174/booking-success/123',
    cancelUrl: 'http://127.0.0.1:5174/checkout/123',
  })
  await expect(page.getByText(/liên hệ chủ sân|hướng dẫn chuyển khoản/)).toHaveCount(0)
  await expect(modal.getByRole('button', { name: 'Hoàn tất', exact: true })).toHaveCount(0)
  payment.confirmPayment()
  await expect(modal.getByText('Đã xác nhận thanh toán thành công!', { exact: true })).toBeVisible({ timeout: 10000 })
  await modal.getByRole('button', { name: 'Hoàn tất', exact: true }).click()
  await expect(page).toHaveURL(/\/booking-success\/123$/)
  await expect(page.getByRole('heading', { name: 'Đặt sân thành công!' })).toBeVisible()
})

test('return URL parameters cannot claim a successful booking before server confirmation', async ({ page }) => {
  const payment = await mockPaymentFlow(page)
  await page.goto('/booking-success/123?code=00&status=PAID&cancel=false')
  await expect(page.getByRole('heading', { name: 'Đang chờ xác nhận thanh toán từ payOS' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Đặt sân thành công!' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true })).toBeVisible()
  payment.confirmPayment()
  await expect(page.getByRole('heading', { name: 'Đặt sân thành công!' })).toBeVisible({ timeout: 10000 })
})

test('owners cannot manually confirm payment or check in an unpaid booking', async ({ page }) => {
  await mockPaymentFlow(page, 'COURT_OWNER')
  await page.goto('/owner/bookings')
  await expect(page.getByText('Chờ khách thanh toán payOS', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Xác nhận nhận sân', exact: true })).toHaveCount(0)
})
