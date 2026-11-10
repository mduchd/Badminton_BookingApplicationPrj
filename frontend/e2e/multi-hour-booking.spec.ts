import { test, expect, type Page } from '@playwright/test'

async function mockBookingApi(page: Page) {
  await page.clock.setFixedTime(new Date('2030-01-01T01:00:00Z'))
  await page.addInitScript(() => localStorage.setItem('smashcourt_auth_token', 'booking-test'))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const envelope = (data: unknown) => ({ success: true, data })
    let data: unknown = []
    if (path.endsWith('/auth/me')) data = envelope({ id: 1, fullName: 'Người đặt sân', role: 'CUSTOMER' })
    else if (path === '/api/facilities/1') data = {
      facility: { id: 1, name: 'Cụm sân kiểm thử', status: 'ACTIVE', isApproved: true, openTime: '12:00', closeTime: '19:00' },
      courts: [1, 2].map(id => ({ id, facilityId: 1, name: `Sân ${id}`, status: 'ACTIVE' })),
      priceRules: [], activeMaintenanceBlocks: [],
    }
    else if (path.endsWith('/availability')) {
      const courtId = Number(path.split('/')[3])
      data = envelope({ courtId, courtName: `Sân ${courtId}`, facilityId: 1, date: '2030-01-01', openTime: '12:00', closeTime: '19:00',
        slots: Array.from({ length: 7 }, (_, i) => ({
          startTime: `${12 + i}:00:00`, endTime: `${13 + i}:00:00`, price: 60000 + i * 30000,
          available: i !== 5, slotStatus: i === 5 ? 'BOOKED' : 'AVAILABLE',
        })),
      })
    } else if (path.endsWith('/check-availability')) {
      const { startTime, endTime } = route.request().postDataJSON()
      const start = Number(startTime.slice(0, 2)), end = Number(endTime.slice(0, 2))
      data = envelope({ isAvailable: !(start < 18 && end > 17), calculatedPrice: Array.from({ length: end - start }, (_, i) => 60000 + (start + i - 12) * 30000).reduce((sum, price) => sum + price, 0) })
    } else if (path === '/api/bookings' && route.request().method() === 'POST') {
      data = envelope({ ...route.request().postDataJSON(), id: 123, totalAmount: 270000, status: 'HELD', currency: 'VND', facilityName: 'Cụm sân kiểm thử', courtName: 'Sân 1', holdExpiresAt: '2030-01-01T01:10:00Z' })
      await route.fulfill({ status: 201, json: data })
      return
    }
    await route.fulfill({ json: data })
  })
  await page.goto('/courts/1/book')
  await expect(page.getByText('Người đặt sân', { exact: true })).toBeVisible()
}

for (const width of [390, 1366]) {
  test(`select and submit a multi-hour interval at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockBookingApi(page)
    await page.getByRole('button', { name: 'Sân 1, 12:00', exact: true }).click()
    await page.getByRole('button', { name: 'Sân 1, 14:00', exact: true }).click()
    for (const hour of [12, 13, 14]) await expect(page.getByRole('button', { name: `Sân 1, ${hour}:00`, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Sân 1: 12:00 – 15:00', { exact: true })).toBeVisible()
    await expect(page.getByText('270.000 đ', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Tiếp tục đặt chỗ', exact: true }).click()
    const modal = page.getByRole('dialog', { name: 'Đặt sân', exact: true })
    await expect(modal.getByText('12:00 - 15:00', { exact: true })).toBeVisible()
    await expect(modal.getByRole('button', { pressed: true })).toHaveCount(3)
    await expect(modal.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true })).toBeEnabled()
    await modal.getByLabel('Ghi chú (tùy chọn):').fill('Đặt ba giờ liên tiếp')
    await page.screenshot({ path: `test-results/multi-hour-${width}.png`, fullPage: true })
    const created = page.waitForRequest(request => new URL(request.url()).pathname === '/api/bookings' && request.method() === 'POST')
    await modal.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).click()
    const request = await created
    expect(request.postDataJSON()).toEqual({ courtId: 1, bookingDate: '2030-01-01', startTime: '12:00:00', endTime: '15:00:00', note: 'Đặt ba giờ liên tiếp' })
    expect(request.headers()['idempotency-key']).toBeTruthy()
  })
}

test('trim, clear, switch courts and dates, and reject a booked gap', async ({ page }) => {
  await mockBookingApi(page)
  const slot = (court: number, hour: number) => page.getByRole('button', { name: `Sân ${court}, ${hour}:00`, exact: true })
  await slot(1, 12).click()
  await slot(1, 15).click()
  await slot(1, 14).click()
  await expect(slot(1, 13)).toHaveAttribute('aria-pressed', 'true')
  await expect(slot(1, 14)).toHaveAttribute('aria-pressed', 'false')
  await slot(1, 12).click()
  await expect(slot(1, 12)).toHaveAttribute('aria-pressed', 'false')
  await expect(slot(1, 13)).toHaveAttribute('aria-pressed', 'true')
  await slot(1, 13).click()
  await expect(page.getByRole('button', { name: 'Tiếp tục đặt chỗ', exact: true })).toBeDisabled()
  await slot(1, 16).click()
  await slot(1, 18).click()
  await expect(page.getByText(/Khoảng giờ có ô đã đặt/)).toBeVisible()
  await expect(slot(1, 18)).toHaveAttribute('aria-pressed', 'false')
  await expect(slot(1, 17)).toBeDisabled()
  await slot(2, 12).click()
  await expect(slot(1, 16)).toHaveAttribute('aria-pressed', 'false')
  await expect(slot(2, 12)).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Ngày mai/ }).click()
  await expect(page.getByRole('button', { name: 'Tiếp tục đặt chỗ', exact: true })).toBeDisabled()
})

test('edit multiple hours in the confirmation modal', async ({ page }) => {
  await mockBookingApi(page)
  await page.getByRole('button', { name: 'Sân 1, 12:00', exact: true }).click()
  await page.getByRole('button', { name: 'Tiếp tục đặt chỗ', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Đặt sân', exact: true })
  await modal.getByRole('button', { name: /14:00 - 15:00/ }).click()
  await expect(modal.getByText('12:00 - 15:00', { exact: true })).toBeVisible()
  await expect(modal.getByRole('button', { pressed: true })).toHaveCount(3)
  await modal.getByRole('button', { name: /13:00 - 14:00/ }).click()
  await expect(modal.getByRole('button', { pressed: true })).toHaveCount(1)
  await modal.getByRole('button', { name: /12:00 - 13:00/ }).click()
  await expect(modal.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true })).toBeDisabled()
})

test('use the server price and block confirmation when the expanded interval becomes unavailable', async ({ page }) => {
  await mockBookingApi(page)
  await page.route('**/api/courts/check-availability', async route => {
    const { endTime } = route.request().postDataJSON()
    await route.fulfill({ json: { success: true, data: {
      isAvailable: endTime === '13:00:00', calculatedPrice: 75000, reason: 'Một phần khoảng giờ vừa được đặt.',
    } } })
  })
  await page.getByRole('button', { name: 'Sân 1, 12:00', exact: true }).click()
  await page.getByRole('button', { name: 'Tiếp tục đặt chỗ', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Đặt sân', exact: true })
  await expect(modal.getByText(/75\.000/)).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true })).toBeEnabled()
  await modal.getByRole('button', { name: /14:00 - 15:00/ }).click()
  await expect(modal.getByRole('alert')).toHaveText('Một phần khoảng giờ vừa được đặt.')
  await expect(modal.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true })).toBeDisabled()
})
