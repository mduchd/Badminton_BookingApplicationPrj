import { test, expect, type APIRequestContext } from '@playwright/test'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVWQAAAAASUVORK5CYII=', 'base64')

async function register(request: APIRequestContext, role: 'COURT_OWNER' | 'CUSTOMER') {
  const response = await request.post('/api/v1/auth/register', { data: {
    email: `upload-${crypto.randomUUID()}@verification.invalid`, password: 'Upload-regression-only-123!',
    fullName: 'Upload Regression', role,
  } })
  expect(response.status()).toBe(201)
  return (await response.json()).data.accessToken as string
}

test('owner uploads an image with a detected extension; customer cannot upload', async ({ request }) => {
  const token = await register(request, 'COURT_OWNER')
  const response = await request.post('/api/owner/uploads/images', {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { files: { name: 'wrong-extension.jpg', mimeType: 'image/png', buffer: png } },
  })
  expect(response.status()).toBe(201)
  const [image] = await response.json()
  expect(image.provider).toBe('LOCAL_STORAGE')
  expect(image.url).toMatch(/\.png$/)
  const stored = await request.get(image.url)
  expect(stored.status()).toBe(200)
  expect(await stored.body()).toEqual(png)

  const customer = await register(request, 'CUSTOMER')
  const denied = await request.post('/api/owner/uploads/images', {
    headers: { Authorization: `Bearer ${customer}` },
    multipart: { files: { name: 'image.png', mimeType: 'image/png', buffer: png } },
  })
  expect(denied.status()).toBe(403)
})

test('server rejects spoofed image content and more than ten files', async ({ request }) => {
  const token = await register(request, 'COURT_OWNER')
  const headers = { Authorization: `Bearer ${token}` }
  const spoofed = await request.post('/api/owner/uploads/images', {
    headers, multipart: { files: { name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('<script>fake</script>') } },
  })
  expect(spoofed.status()).toBe(400)
  const files = new FormData()
  for (let i = 0; i < 11; i++) files.append('files', new File([png], `image-${i}.png`, { type: 'image/png' }))
  const oversizedBatch = await request.post('/api/owner/uploads/images', { headers, multipart: files })
  expect(oversizedBatch.status()).toBe(400)
})

test('browser rejects invalid batches before sending and accepts the ten-file boundary', async ({ page }) => {
  let uploadRequests = 0
  await page.route('**/api/owner/uploads/images', async route => {
    uploadRequests++
    await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
  })
  await page.goto('/')
  const errors = await page.evaluate(async moduleUrl => {
    const { courtApi } = await import(moduleUrl)
    const png = new File(['fixture'], 'image.png', { type: 'image/png' })
    const invalidBatches = [
      Array.from({ length: 11 }, () => png),
      [new File(['text'], 'image.svg', { type: 'image/svg+xml' })],
      [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })],
    ]
    const errors: string[] = []
    for (const files of invalidBatches) {
      try { await courtApi.uploadImages(files); errors.push('accepted') }
      catch (error) { errors.push(error instanceof Error ? error.message : String(error)) }
    }
    await courtApi.uploadImages([])
    return errors
  }, '/src/modules/court/services/courtApi.ts')
  expect(errors[0]).toContain('10')
  expect(errors[1]).toContain('image.svg')
  expect(errors[2]).toContain('10MB')
  expect(uploadRequests).toBe(0)

  await page.evaluate(async moduleUrl => {
    const { courtApi } = await import(moduleUrl)
    await courtApi.uploadImages(Array.from({ length: 10 }, (_, i) => new File(['fixture'], `image-${i}.png`, { type: 'image/png' })))
  }, '/src/modules/court/services/courtApi.ts')
  expect(uploadRequests).toBe(1)
})
