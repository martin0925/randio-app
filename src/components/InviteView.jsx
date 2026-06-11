import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import confetti from 'canvas-confetti'
import { db } from '../firebase'
import { baseUrl, openInCalendar } from '../utils'
import EnvelopeView from './EnvelopeView'
import LetterCard from './LetterCard'
import ShareButtons from './ShareButtons'
import Planner from './Planner'

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

export default function InviteView({ randeId }) {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [envelopeOpened, setEnvelopeOpened] = useState(false)
  const [selectedOpt, setSelectedOpt] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const prevStav = useRef(null)

  const isCreator = localStorage.getItem(`creator_${randeId}`) === '1'

  useEffect(() => {
    if (plan?.stav === 'potvrzeno' && prevStav.current && prevStav.current !== 'potvrzeno') {
      fireConfetti()
    }
    if (plan?.stav) prevStav.current = plan.stav
  }, [plan?.stav])

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

  if (loading) return <p className="sub" style={{ marginTop: '40vh' }}>Načítám… 💗</p>

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
      <Planner
        editDoc={doc(db, 'rande', randeId)}
        prefill={plan}
        onEditDone={() => setEditing(false)}
      />
    )
  }

  if (!isCreator && !envelopeOpened) {
    return <EnvelopeView onOpen={() => setEnvelopeOpened(true)} />
  }

  const invUrl = `${baseUrl()}?id=${randeId}`

  return (
    <>
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

      <div className="row" style={{ marginTop: '12px' }}>
        <button className="secondary" onClick={() => plan && openInCalendar(plan)}>
          📅 Uložit do kalendáře
        </button>
        <button className="secondary" onClick={() => { window.location.href = baseUrl() }}>
          ✨ Naplánovat jiné rande
        </button>
      </div>

      <div style={{ marginTop: '12px' }}>
        <ShareButtons url={invUrl} />
      </div>

      {error && <p className="error">{error}</p>}
    </>
  )
}
