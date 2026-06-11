import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

const app = initializeApp({
  apiKey: 'AIzaSyB6VxL7p01MaUEF2wyd1PW_NKoMhN896k4',
  authDomain: 'randio-app.firebaseapp.com',
  projectId: 'randio-app',
  storageBucket: 'randio-app.firebasestorage.app',
  messagingSenderId: '734128383908',
  appId: '1:734128383908:web:6daf4ba42fd1a33ee58331',
})

const messaging = getMessaging(app)

onBackgroundMessage(messaging, (payload) => {
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || 'Randio 💗', {
    body: body || '',
    icon: '/randio-app/icon-192.png',
    badge: '/randio-app/icon-192.png',
    data: payload.data,
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.link || 'https://martin0925.github.io/randio-app/'
  event.waitUntil(clients.openWindow(url))
})
