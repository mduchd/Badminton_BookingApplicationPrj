import { test, expect, type APIRequestContext } from '@playwright/test'

const password = 'Role-regression-only-123!'
const tomorrow = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  const date = new Date(`${today}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
async function register(request: APIRequestContext, role: 'CUSTOMER' | 'COURT_OWNER') {
  const response = await request.post('/api/v1/auth/register', { data: {
    email: `role-${crypto.randomUUID()}@verification.invalid`, fullName: `Regression ${role}`, password, role,
  } })
  expect(response.status()).toBe(201)
  return (await response.json()).data as { accessToken: string }
}
const headers = (token: string) => ({ Authorization: `Bearer ${token}` })

for (const width of [360, 768, 1366, 1920]) {
  test(`owner saves default contacts and edits pending profile at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 900 })
    const owner = await register(request, 'COURT_OWNER')
    await page.addInitScript(token => localStorage.setItem('smashcourt_auth_token', token), owner.accessToken)
    const name = `Regression Contact ${crypto.randomUUID().slice(0, 8)}`
    let facilityId: number | undefined
    try {
      await page.goto('/owner/facilities')
      await page.getByRole('button', { name: 'Thêm cụm sân mới', exact: true }).click()
      const modal = page.getByRole('dialog', { name: 'Thiết lập sân', exact: true })
      await modal.getByLabel('Tên chi nhánh / cụm sân *', { exact: true }).fill(name)
      await modal.getByLabel('Số nhà, ngõ, tên đường *', { exact: true }).fill('321 Regression')
      // Preserve both default telephone numbers and their descriptions: this failed on VARCHAR(30).
      await expect(modal.getByRole('button', { name: 'Tạo cụm sân', exact: true })).toBeInViewport()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
      await page.screenshot({ path: `test-results/owner-pending-form-${width}.png`, fullPage: true })
      const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/owner/facilities' && r.request().method() === 'POST')
      await modal.getByRole('button', { name: 'Tạo cụm sân', exact: true }).click()
      const response = await created
      expect(response.status()).toBe(201)
      const facility = await response.json()
      facilityId = facility.id
      expect(facility.isApproved).toBe(false)
      expect(facility.status).toBe('PENDING_APPROVAL')
      expect(facility.phone).toContain('Chốt lịch qua Zalo')
      await expect(modal).toHaveCount(0)
      await expect(page.getByText('Chờ duyệt', { exact: true }).last()).toBeVisible()
      await page.getByRole('button', { name: 'Chỉnh sửa cơ sở', exact: true }).click()
      await expect(modal.getByLabel('Trạng thái vận hành', { exact: true })).toBeDisabled()
      await modal.getByLabel('Tên chi nhánh / cụm sân *', { exact: true }).fill(name + ' Updated')
      const updated = page.waitForResponse(r => new URL(r.url()).pathname === `/api/owner/facilities/${facilityId}` && r.request().method() === 'PUT')
      await modal.getByRole('button', { name: 'Lưu cập nhật', exact: true }).click()
      const saved = await updated
      expect(saved.status()).toBe(200)
      expect(saved.request().postDataJSON().status).toBeUndefined()
      expect((await saved.json()).status).toBe('PENDING_APPROVAL')
      await expect(modal).toHaveCount(0)
      await page.reload()
      await expect(page.getByText(name + ' Updated', { exact: true })).toBeVisible()
      expect((await request.get(`/api/facilities/${facilityId}`)).status()).toBe(404)
    } finally {
      if (facilityId) await request.delete(`/api/owner/facilities/${facilityId}`, { headers: headers(owner.accessToken) })
    }
  })
}

test('admin moderation controls real customer booking and cannot be bypassed by owner deletion', async ({ page, request }) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, 'Requires an administrator in the isolated E2E database')
  const login = await request.post('/api/v1/auth/login', { data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD } })
  expect(login.status()).toBe(200)
  const admin = (await login.json()).data
  const owner = await register(request, 'COURT_OWNER')
  const customer = await register(request, 'CUSTOMER')
  const name = `Regression Moderation ${crypto.randomUUID().slice(0, 8)}`
  const created = await request.post('/api/owner/facilities', { headers: headers(owner.accessToken), data: {
    name, district: 'Cầu Giấy', city: 'Hà Nội', address: '123 Regression', phone: '0901234567', openTime: '06:00', closeTime: '23:00',
  } })
  expect(created.status()).toBe(201)
  const fixture = await created.json()
  let bookingId: number | undefined
  try {
    await page.addInitScript(token => localStorage.setItem('smashcourt_auth_token', token), admin.accessToken)
    await page.goto('/admin')
    await page.getByRole('button', { name: /Kiểm duyệt Cụm sân/ }).click()
    await page.getByPlaceholder('Tìm tên cụm sân, địa chỉ...').fill(name)
    const row = page.locator('tr').filter({ hasText: name })
    await expect(row.getByText('Chờ kiểm duyệt', { exact: true })).toBeVisible()
    const approved = page.waitForResponse(r => r.url().includes(`/facilities/${fixture.id}/approval`) && r.request().method() === 'PATCH')
    await row.getByRole('button', { name: 'Duyệt', exact: true }).click()
    expect((await approved).status()).toBe(200)
    await expect(row.getByText('Đã duyệt', { exact: true })).toBeVisible()
    expect((await request.get(`/api/facilities/${fixture.id}`)).status()).toBe(200)
    const detail = await (await request.get(`/api/facilities/${fixture.id}/courts`)).json()
    const payload = { courtId: detail[0].id, bookingDate: tomorrow(), startTime: '18:00', endTime: '19:00' }
    const held = await request.post('/api/bookings', { headers: headers(customer.accessToken), data: payload })
    expect(held.status()).toBe(201)
    bookingId = (await held.json()).data.id
    const paused = page.waitForResponse(r => r.url().includes(`/facilities/${fixture.id}/status`) && r.request().method() === 'PATCH')
    await row.getByRole('button', { name: 'Tạm khóa', exact: true }).click()
    expect((await paused).status()).toBe(200)
    await expect(row.getByText('Đang khóa', { exact: true })).toBeVisible()
    expect((await request.delete(`/api/owner/facilities/${fixture.id}`, { headers: headers(owner.accessToken) })).status()).toBe(204)
    expect((await request.patch(`/api/owner/facilities/${fixture.id}/status`, { headers: headers(owner.accessToken), data: { status: 'ACTIVE' } })).status()).toBe(400)
    expect((await request.post('/api/bookings', { headers: headers(customer.accessToken), data: { ...payload, startTime: '20:00', endTime: '21:00' } })).status()).toBe(400)
    const resumed = page.waitForResponse(r => r.url().includes(`/facilities/${fixture.id}/status`) && r.request().method() === 'PATCH')
    await row.getByRole('button', { name: 'Mở lại', exact: true }).click()
    expect((await resumed).status()).toBe(200)
    await expect(row.getByText('Đang mở', { exact: true })).toBeVisible()
  } finally {
    if (bookingId) await request.post(`/api/bookings/${bookingId}/cancel`, { headers: headers(customer.accessToken) })
    await request.delete(`/api/owner/facilities/${fixture.id}`, { headers: headers(owner.accessToken) })
  }
})
