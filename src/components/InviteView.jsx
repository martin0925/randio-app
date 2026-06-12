import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import confetti from 'canvas-confetti'
import { db, auth } from '../firebase'
import { baseUrl, openInCalendar } from '../utils'
import EnvelopeView from './EnvelopeView'
import LetterCard from './LetterCard'
import ShareButtons from './ShareButtons'
import Planner from './Planner'

function InAppToast({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="in-app-toast" role="status">
      <span>{msg}</span>
      <button className="in-app-toast-close" onClick={onClose} aria-label="Zavřít">×</button>
    </div>
  )
}

function StickyNotif({ msg, onDismiss }) {
  return (
    <div className="sticky-notif" role="alert">
      <span className="sticky-notif-msg">{msg}</span>
      <button className="sticky-notif-close" onClick={onDismiss}>Zobrazeno ✓</button>
    </div>
  )
}

const CONFETTI_COLORS = ['#e2477d', '#c2185b', '#ff8fb1', '#fff', '#ffc0cb', '#ff4d94']

function fireConfetti() {
  const burst = (x, delay = 0) => setTimeout(() =>
    confetti({ particleCount: 70, spread: 75, origin: { x, y: 0.55 }, colors: CONFETTI_COLORS, scalar: 1.1 }),
    delay
  )
  burst(0.5)
  burst(0.3, 220)
  burst(0.7, 380)
}

function buildNotifMsg(prev, curr, plan, isCreator) {
  let msg = null
  if (prev.stav !== curr.stav) {
    if (curr.stav === 'potvrzeno' && isCreator)
      msg = `🎉 ${plan.komu || 'Příjemce'} přijal/a pozvánku!`
    else if (curr.stav === 'potvrzeno' && !isCreator)
      msg = `🎉 Rande je potvrzeno!`
    else if (curr.stav === 'protinavrh' && isCreator)
      msg = `💌 ${plan.komu || 'Příjemce'} upravil/a pozvánku`
    else if (curr.stav === 'protinavrh' && !isCreator)
      msg = `💌 ${plan.od || 'Tvůj partner'} upravil/a pozvánku`
  }
  if (!prev.odpoved && curr.odpoved && isCreator) {
    const preview = curr.odpoved.length > 50 ? curr.odpoved.slice(0, 50) + '…' : curr.odpoved
    msg = `💬 ${plan.komu || 'Příjemce'}: „${preview}"`
  }
  return msg
}

export default function InviteView({ randeId }) {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [envelopeOpened, setEnvelopeOpened] = useState(false)
  const [selectedOpt, setSelectedOpt] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState(null)
  const [stickyMsg, setStickyMsg] = useState(null)

  const prevStav = useRef(null)
  const prevPlan = useRef(null)
  const firstLoadDone = useRef(false)

  const isCreator = localStorage.getItem(`creator_${randeId}`) === '1'
  const profileLinked = useRef(false)

  useEffect(() => {
    if (plan?.stav === 'potvrzeno' && prevStav.current && prevStav.current !== 'potvrzeno') {
      fireConfetti()
    }
    if (plan?.stav) prevStav.current = plan.stav
  }, [plan?.stav])

  useEffect(() => {
    if (!plan || isCreator || profileLinked.current) return
    const user = auth.currentUser
    if (!user || plan.uid_prijemce) return
    profileLinked.current = true
    updateDoc(doc(db, 'rande', randeId), { uid_prijemce: user.uid }).catch(() => {})
  }, [plan])

  useEffect(() => {
    if (!plan) return
    const seenKey = `seen_${randeId}`
    const curr = { stav: plan.stav, odpoved: plan.odpoved || null }

    if (!firstLoadDone.current) {
      firstLoadDone.current = true
      const stored = JSON.parse(localStorage.getItem(seenKey) || 'null')
      if (stored) {
        const msg = buildNotifMsg(stored, curr, plan, isCreator)
        if (msg) {
          setStickyMsg(msg)
          navigator.setAppBadge?.(1).catch?.(() => {})
          document.title = '(!) Randio'
        } else {
          localStorage.setItem(seenKey, JSON.stringify(curr))
        }
      } else {
        localStorage.setItem(seenKey, JSON.stringify(curr))
      }
    } else {
      if (prevPlan.current) {
        const msg = buildNotifMsg(prevPlan.current, curr, plan, isCreator)
        if (msg) {
          setToast(msg)
          localStorage.setItem(seenKey, JSON.stringify(curr))
        }
      }
    }

    prevPlan.current = curr
  }, [plan])

  useEffect(() => {
    return () => { document.title = 'Randio' }
  }, [])

  function dismissSticky() {
    setStickyMsg(null)
    navigator.clearAppBadge?.().catch?.(() => {})
    document.title = 'Randio'
    if (plan) {
      localStorage.setItem(`seen_${randeId}`, JSON.stringify({
        stav: plan.stav,
        odpoved: plan.odpoved || null,
      }))
    }
  }

  useEffect(() => {
    const ref = doc(db, 'rande', randeId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setLoading(false)
        if (!snap.exists()) { setNotFound(true); return }
        setPlan(snap.data())
      },
      (err) => { setLoading(false); setError('Nepodařilo se načíst rande: ' + err.message) }
    )
    return unsub
  }, [randeId])

  async function handleConfirm() {
    const ref = doc(db, 'rande', randeId)
    const upd = { stav: 'potvrzeno', potvrzeno_kdy: serverTimestamp() }
    if (selectedOpt) upd.datum = selectedOpt
    try { await updateDoc(ref, upd) }
    catch (err) { setError('Potvrzení se nepodařilo uložit: ' + err.message) }
  }

  async function handleSendReply(text) {
    try { await updateDoc(doc(db, 'rande', randeId), { odpoved: text }) }
    catch (err) { setError('Odpověď se nepodařilo uložit: ' + err.message) }
  }

  if (loading) return (
    <div className="planner-loader">
      <div className="loader-heart-wrap"><LoaderHeart /></div>
    </div>
  )

  if (notFound) {
    return (
      <div className="letter-card">
        <span style={{ fontSize: '2rem' }}>🥀</span>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', color: '#a8244e' }}>Rande nebylo nalezeno</h2>
        <p>Odkaz je neúplný nebo bylo rande smazáno.</p>
      </div>
    )
  }

  if (editing) {
    return (
      <>
        <button className="back-btn" onClick={() => setEditing(false)}>
          ‹ Zpět na pozvánku
        </button>
        <Planner
          editDoc={doc(db, 'rande', randeId)}
          prefill={plan}
          onEditDone={() => setEditing(false)}
        />
      </>
    )
  }

  if (!isCreator && !envelopeOpened) {
    return <EnvelopeView onOpen={() => setEnvelopeOpened(true)} />
  }

  const invUrl = `${baseUrl()}?id=${randeId}`

  return (
    <>
      {stickyMsg && (
        <StickyNotif msg={stickyMsg} onDismiss={dismissSticky} />
      )}

      {toast && (
        <InAppToast msg={toast} onClose={() => setToast(null)} />
      )}

      <p className="sub" style={{ marginBottom: '10px' }}>
        <span className="live-dot"></span>Živé sledování — odpověď uvidíš okamžitě
      </p>

      <LetterCard
        plan={plan}
        selectedOpt={selectedOpt}
        onSelectOpt={(opt) => setSelectedOpt(opt)}
        onConfirm={handleConfirm}
        onEdit={() => setEditing(true)}
        isCreator={isCreator}
        onSendReply={handleSendReply}
      />

      <div className="invite-actions">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ShareButtons url={invUrl} />
        </div>
        <div className="row" style={{ marginTop: '10px' }}>
          <button className="secondary" onClick={() => plan && openInCalendar(plan)}>
            📅 Uložit do kalendáře
          </button>
          <button className="secondary" onClick={() => { window.location.href = baseUrl() }}>
            ✨ Naplánovat jiné rande
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
    </>
  )
}

function LoaderHeart() {
  return (
    <svg className="loader-heart-svg" viewBox="0 0 32 29.6" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ivhg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9e1a45"/>
          <stop offset="45%" stopColor="#d8366c"/>
          <stop offset="100%" stopColor="#c2185b"/>
        </linearGradient>
      </defs>
      <path fill="url(#ivhg)" d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4
        c0,9.4,9.5,11.9,16,21.2c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z"/>
    </svg>
  )
}
