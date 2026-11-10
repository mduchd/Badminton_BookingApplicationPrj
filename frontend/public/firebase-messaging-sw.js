// FCM delivers a standard PushEvent; no secrets or Firebase configuration are embedded here.
self.addEventListener('push', event => {
  let payload
  try { payload = event.data?.json() } catch { return }
  if (!payload) return
  const data = payload.data || payload.notification || {}
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const visible = windows.filter(client => client.visibilityState === 'visible')
    if (visible.length) {
      visible.forEach(client => client.postMessage({ type: 'smashcourt-push', title: data.title, body: data.body }))
      return
    }
    await self.registration.showNotification(data.title || 'SmashCourt', {
      body: data.body || 'Lịch đặt sân đã cập nhật.', tag: data.tag || 'smashcourt-booking',
      data: { link: '/account?section=bookings' },
    })
  })())
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const url = new URL('/account?section=bookings', self.location.origin).href
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin)
    if (existing) { await existing.navigate(url); await existing.focus() }
    else await self.clients.openWindow(url)
  })())
})
