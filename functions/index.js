const { onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()

const BASE_URL = 'https://martin0925.github.io/randio-app/'

exports.notifyOnRandeUpdate = onDocumentUpdated('rande/{docId}', async (event) => {
  const before = event.data.before.data()
  const after = event.data.after.data()
  const docId = event.params.docId
  const link = `${BASE_URL}?id=${docId}`

  const messages = []

  // Creator notified: invite confirmed by recipient
  if (before.stav !== 'potvrzeno' && after.stav === 'potvrzeno' && after.fcm_creator) {
    const kdo = after.komu || 'Někdo'
    messages.push({
      token: after.fcm_creator,
      notification: { title: 'Rande potvrzeno! 💗', body: `${kdo} přijal/a pozvánku!` },
      webpush: { fcmOptions: { link } },
    })
  }

  // Counter-proposal notifications — use "upravil" field to know who sent it
  if (after.stav === 'protinavrh' && after.stav !== before.stav) {
    if (after.upravil === 'prijemce' && after.fcm_creator) {
      const kdo = after.komu || 'Příjemce'
      messages.push({
        token: after.fcm_creator,
        notification: { title: 'Nový protinávrh 💌', body: `${kdo} upravil/a pozvánku` },
        webpush: { fcmOptions: { link } },
      })
    }
    if (after.upravil === 'tvurce' && after.fcm_prijemce) {
      const kdo = after.od || 'Tvůj partner'
      messages.push({
        token: after.fcm_prijemce,
        notification: { title: 'Nový protinávrh 💌', body: `${kdo} upravil/a pozvánku` },
        webpush: { fcmOptions: { link } },
      })
    }
  }

  // Creator notified: recipient sent a text reply
  if (!before.odpoved && after.odpoved && after.fcm_creator) {
    const kdo = after.komu || 'Příjemce'
    messages.push({
      token: after.fcm_creator,
      notification: { title: 'Nová zpráva 💬', body: `${kdo}: ${after.odpoved.slice(0, 80)}` },
      webpush: { fcmOptions: { link } },
    })
  }

  if (messages.length === 0) return

  const messaging = getMessaging()
  await Promise.allSettled(
    messages.map((msg) =>
      messaging.send(msg).catch((err) => console.error('FCM send error:', err.message))
    )
  )
})
