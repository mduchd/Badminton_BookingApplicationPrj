import { test, expect } from '@playwright/test'

for (const width of [360, 768, 1366, 1920]) {
  test(`AI → exact interval → real HOLD, viewport ${width}`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 })
    const registered = await request.post('/api/v1/auth/register', { data: {
      email: `e2e-${crypto.randomUUID()}@verification.invalid`, password: 'Verification-test-only-123!',
      fullName: 'E2E Verification', role: 'CUSTOMER',
    } })
    expect(registered.status()).toBe(201)
    const { data: auth } = await registered.json()
    await page.addInitScript(token => localStorage.setItem('smashcourt_auth_token', token), auth.accessToken)
    const headers = { Authorization: `Bearer ${auth.accessToken}` }
    let bookingId: number | undefined
    try {
      await page.goto('/')
      await page.getByRole('button', { name: 'Mở Trợ lý AI', exact: true }).first().click()
      const aiResponse = page.waitForResponse(r => r.url().endsWith('/api/v1/ai/search') && r.request().method() === 'POST')
      await page.getByPlaceholder('Nhập: khu vực, giờ, hỏi luật hay chọn vợt...').fill('Tìm sân Verification ngày mai 19–21h dưới 150k/giờ')
      await page.getByPlaceholder('Nhập: khu vực, giờ, hỏi luật hay chọn vợt...').press('Enter')
      const response = await aiResponse
      expect(response.ok()).toBeTruthy()
      const result = (await response.json()).data.recommendedCourts[0]
      expect(result.courtId).toBe(900000002)
      expect(result.totalPrice).toBe(240000)
      await page.getByRole('button', { name: 'Chọn sân và khung giờ này' }).first().click()
      const modal = page.getByRole('dialog', { name: 'Đặt sân', exact: true })
      await expect(modal.getByRole('heading', { name: 'Verification Court 1' }).first()).toBeVisible()
      await expect(modal.locator('input[type="date"]')).toHaveValue(result.date)
      await expect(modal.getByText('19:00 - 21:00', { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
      await page.screenshot({ path: `test-results/booking-${width}.png`, fullPage: true })
      const created = page.waitForResponse(r => r.url().endsWith('/api/bookings') && r.request().method() === 'POST')
      await modal.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).click()
      const held = await created
      expect(held.status()).toBe(201)
      expect(held.request().headers()['idempotency-key']).toBeTruthy()
      const booking = (await held.json()).data
      bookingId = booking.id
      expect(booking.courtId).toBe(result.courtId)
      expect(booking.totalAmount).toBe(result.totalPrice)
      expect(booking.status).toBe('HELD')
      const repeated = await request.post('/api/bookings', {
        headers: { ...headers, 'Idempotency-Key': held.request().headers()['idempotency-key'] },
        data: held.request().postDataJSON(),
      })
      expect((await repeated.json()).data.id).toBe(booking.id)
    } finally {
      if (bookingId) await request.post(`/api/bookings/${bookingId}/cancel`, { headers })
    }
  })
}
