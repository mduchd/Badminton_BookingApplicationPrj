import { accountApi } from '../account/accountApi'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
export const pushConfigured = Object.values(firebaseConfig).every(Boolean) && !!import.meta.env.VITE_FIREBASE_VAPID_KEY
const tokenKey = 'smashcourt_push_token'

async function messaging() {
  const [{ initializeApp, getApps }, { getMessaging, isSupported }] = await Promise.all([import('@firebase/app'), import('@firebase/messaging')])
  if (!(await isSupported())) throw new Error('Trình duyệt này chưa hỗ trợ thông báo. Hãy dùng trình duyệt hỗ trợ Web Push trên HTTPS.')
  return getMessaging(getApps()[0] || initializeApp(firebaseConfig))
}
export async function enablePush() {
  if (!pushConfigured) throw new Error('Thông báo trình duyệt hiện chưa khả dụng.')
  if (!('Notification' in window) || !('serviceWorker' in navigator)) throw new Error('Trình duyệt này chưa hỗ trợ thông báo.')
  if (await Notification.requestPermission() !== 'granted') throw new Error('Bạn chưa cho phép thông báo. Có thể cấp quyền trong cài đặt trình duyệt.')
  const [{ getToken }, client] = await Promise.all([import('@firebase/messaging'), messaging()])
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  await navigator.serviceWorker.ready
  const token = await getToken(client, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) throw new Error('Không thể đăng ký thông báo. Vui lòng thử lại.')
  const user = await accountApi.subscribePush(token)
  localStorage.setItem(tokenKey, token)
  return user
}
export async function disablePush() {
  const user = await accountApi.unsubscribePush()
  await removeLocalPushToken()
  return user
}
async function removeLocalPushToken() {
  localStorage.removeItem(tokenKey)
  if (pushConfigured && 'serviceWorker' in navigator) {
    try { const { deleteToken } = await import('@firebase/messaging'); await deleteToken(await messaging()) } catch { /* Server subscriptions are already removed. */ }
  }
}
export async function detachPushOnLogout(accessToken: string) {
  const token = localStorage.getItem(tokenKey)
  if (token) {
    localStorage.removeItem(tokenKey)
    await accountApi.unsubscribePush(token, accessToken)
  }
}
