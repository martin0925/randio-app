import { useState, useEffect } from 'react'
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { ACTIVITIES } from '../constants'
import { fmtDate, parseDate, findAct, baseUrl } from '../utils'
import './AdminView.css'

const provider = new GoogleAuthProvider()

export default function AdminView() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('prefs')

  if (loading) return <p className="sub" style={{ marginTop: '40vh' }}>Načítám… 💗</p>

  if (!user) return <LoginScreen />

  return (
    <div className="admin-view">
      <AdminHeader user={user} />
      <div className="admin-tabs">
        <button className={`admin-tab${tab === 'prefs' ? ' active' : ''}`} onClick={() => setTab('prefs')}>
          ⚙️ Preference
        </button>
        <button className={`admin-tab${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>
          💌 Aktivní
        </button>
        <button className={`admin-tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>
          📚 Historie
        </button>
      </div>
      {tab === 'prefs'   && <PrefsPanel uid={user.uid} />}
      {tab === 'active'  && <InviteList uid={user.uid} filter="active" />}
      {tab === 'history' && <InviteList uid={user.uid} filter="history" />}
    </div>
  )
}

function LoginScreen() {
  const [err, setErr] = useState(null)

  async function handleSignIn() {
    setErr(null)
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') setErr(e.message)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-icon">💗</div>
      <h1 className="title">Admin</h1>
      <p className="sub">Přihlas se a spravuj svá randíčka</p>
      <button className="google-btn" onClick={handleSignIn}>
        <GoogleIcon />
        Přihlásit se přes Google
      </button>
      {err && <p className="error" style={{ marginTop: 12 }}>{err}</p>}
      <a href={baseUrl()} className="back-link">← Zpět na planner</a>
    </div>
  )
}

function AdminHeader({ user }) {
  return (
    <div className="admin-header">
      {user.photoURL && <img src={user.photoURL} className="admin-avatar" alt="" referrerPolicy="no-referrer" />}
      <div className="admin-user-info">
        <span className="admin-name">{user.displayName}</span>
        <span className="admin-email">{user.email}</span>
      </div>
      <button className="admin-signout" onClick={() => signOut(auth)}>Odhlásit</button>
    </div>
  )
}

function PrefsPanel({ uid }) {
  const [jmeno, setJmeno] = useState('')
  const [jmenoPartnera, setJmenoPartnera] = useState('')
  const [pohlavi, setPohlavi] = useState('')
  const [pohlaviPartnera, setPohlaviPartnera] = useState('')
  const [osloveni, setOsloveni] = useState('tykani')
  const [oblibene, setOblibene] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'users', uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setJmeno(d.jmeno || '')
        setJmenoPartnera(d.jmeno_partnera || '')
        setPohlavi(d.pohlavi || '')
        setPohlaviPartnera(d.pohlavi_partnera || '')
        setOsloveni(d.osloveni || 'tykani')
        setOblibene(d.oblibene_aktivity || [])
      }
      setLoaded(true)
    })
  }, [uid])

  async function handleSave() {
    setSaving(true)
    await setDoc(doc(db, 'users', uid), {
      jmeno, jmeno_partnera: jmenoPartnera,
      pohlavi, pohlavi_partnera: pohlaviPartnera,
      osloveni, oblibene_aktivity: oblibene,
      updated: serverTimestamp(),
    }, { merge: true })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function toggleOblibena(id) {
    setOblibene((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  if (!loaded) return <p className="sub" style={{ padding: '24px 0' }}>Načítám…</p>

  return (
    <div className="admin-prefs">
      <div className="pref-section">
        <label className="pref-label">✍️ Tvoje jméno</label>
        <input className="input" style={{ marginTop: 6 }} type="text" value={jmeno}
          placeholder="Jak se jmenuješ?" onChange={(e) => setJmeno(e.target.value)} />
      </div>

      <div className="pref-section">
        <label className="pref-label">💑 Tvoje pohlaví</label>
        <div className="pref-radio-group">
          {[['muz','Muž'],['zena','Žena'],['jine','Jiné']].map(([val, label]) => (
            <button key={val} className={`pref-radio${pohlavi === val ? ' sel' : ''}`}
              onClick={() => setPohlavi(val)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="pref-section">
        <label className="pref-label">💌 Jméno partnera / partnerky</label>
        <input className="input" style={{ marginTop: 6 }} type="text" value={jmenoPartnera}
          placeholder="Komu posíláš pozvánky?" onChange={(e) => setJmenoPartnera(e.target.value)} />
      </div>

      <div className="pref-section">
        <label className="pref-label">💑 Pohlaví partnera / partnerky</label>
        <div className="pref-radio-group">
          {[['muz','Muž'],['zena','Žena'],['jine','Jiné']].map(([val, label]) => (
            <button key={val} className={`pref-radio${pohlaviPartnera === val ? ' sel' : ''}`}
              onClick={() => setPohlaviPartnera(val)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="pref-section">
        <label className="pref-label">🗣️ Oslovení v dopise</label>
        <div className="pref-radio-group">
          <button className={`pref-radio${osloveni === 'tykani' ? ' sel' : ''}`}
            onClick={() => setOsloveni('tykani')}>Tykání</button>
          <button className={`pref-radio${osloveni === 'vykani' ? ' sel' : ''}`}
            onClick={() => setOsloveni('vykani')}>Vykání</button>
        </div>
      </div>

      <div className="pref-section">
        <label className="pref-label">❤️ Oblíbené aktivity</label>
        <p className="pref-hint">Zobrazí se jako výchozí výběr v planneru</p>
        <div className="pref-acts">
          {ACTIVITIES.map((a) => (
            <button key={a.id} className={`pref-act${oblibene.includes(a.id) ? ' sel' : ''}`}
              onClick={() => toggleOblibena(a.id)}>
              <span>{a.emoji}</span>{a.label}
            </button>
          ))}
        </div>
      </div>

      <button className="cta" onClick={handleSave} disabled={saving}>
        {saved ? 'Uloženo ✓' : saving ? 'Ukládám…' : 'Uložit preference'}
      </button>
    </div>
  )
}

function InviteList({ uid, filter }) {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'rande'), where('uid', '==', uid))).then((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.vytvoreno?.seconds || 0) - (a.vytvoreno?.seconds || 0))
      setInvites(docs)
      setLoading(false)
    })
  }, [uid])

  if (loading) return <p className="sub" style={{ padding: '24px 0' }}>Načítám…</p>

  const filtered = filter === 'active'
    ? invites.filter((i) => i.stav !== 'potvrzeno')
    : invites.filter((i) => i.stav === 'potvrzeno')

  if (filtered.length === 0) {
    return (
      <div className="invite-empty">
        <span>{filter === 'active' ? '🌹' : '📖'}</span>
        <p>{filter === 'active' ? 'Žádná čekající randíčka' : 'Zatím žádná potvrzená randíčka'}</p>
        <a href={baseUrl()} className="back-link" style={{ marginTop: 0 }}>Vytvořit pozvánku →</a>
      </div>
    )
  }

  return (
    <div className="invite-list">
      {filtered.map((inv) => <InviteItem key={inv.id} invite={inv} />)}
    </div>
  )
}

function InviteItem({ invite }) {
  const known = findAct(invite.aktivita)
  const label = known ? `${known.emoji} ${known.label}` : invite.aktivita
  const dateStr = invite.datum ? fmtDate(parseDate(invite.datum)) : '—'
  const stavLabel = {
    navrh: 'čeká na odpověď',
    protinavrh: 'protinávrh',
    potvrzeno: 'potvrzeno ✓',
  }[invite.stav] || invite.stav

  return (
    <div className="invite-item">
      <div className="invite-item-top">
        <span className="invite-activity">{label}</span>
        <span className={`badge ${invite.stav}`}>{stavLabel}</span>
      </div>
      <div className="invite-item-bottom">
        <span className="invite-date">📅 {dateStr} · 🕐 {invite.cas}</span>
        {invite.komu && <span className="invite-komu">→ {invite.komu}</span>}
        <a href={`${baseUrl()}?id=${invite.id}`} className="invite-link">Otevřít →</a>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.075 17.64 11.766 17.64 9.2z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
