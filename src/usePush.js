import { getToken } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { getMsg, db } from './firebase'

// Get this from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Key pair
const VAPID_KEY = 'REPLACE_WITH_VAPID_KEY'

export async function requestAndStorePush(randeId, field) {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'denied') return

    const messaging = await getMsg()
    if (!messaging) return

    const swReg = await navigator.serviceWorker.ready
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg })
    if (!token) return

    await updateDoc(doc(db, 'rande', randeId), { [field]: token })
  } catch {
    // Permission denied or unsupported — silently ignore
  }
}
