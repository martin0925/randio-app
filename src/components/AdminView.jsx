import { useState, useEffect } from 'react'
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, deleteDoc, updateDoc, deleteField, addDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { ACTIVITIES } from '../constants'
import { fmtDate, parseDate, findAct, baseUrl } from '../utils'
import './AdminView.css'

const provider = new GoogleAuthProvider()

export default function AdminView() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('prefs')

  if (loading) return (
    <div className="planner-loader">
      <div className="loader-heart-wrap"><LoaderHeart /></div>
      <h1 className="title" style={{ marginTop: 4 }}><span className="title-text">Randio</span></h1>
    </div>
  )

  if (!user) return <LoginScreen />

  return (
    <div className="admin-view">
      <AdminHeader user={user} />
      <div className="admin-tabs">
        <button className={`admin-tab${tab === 'prefs' ? ' active' : ''}`} onClick={() => setTab('prefs')}>
          ⚙️ Nastavení
        </button>
        <button className={`admin-tab${tab === 'friends' ? ' active' : ''}`} onClick={() => setTab('friends')}>
          👥 Přátelé
        </button>
        <button className={`admin-tab${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>
          💌 Aktivní
        </button>
        <button className={`admin-tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>
          📚 Historie
        </button>
      </div>
      <div className="tab-panel" key={tab}>
        {tab === 'prefs'   && <PrefsPanel user={user} />}
        {tab === 'friends' && <FriendsPanel user={user} />}
        {tab === 'active'  && <InviteList uid={user.uid} filter="active" />}
        {tab === 'history' && <InviteList uid={user.uid} filter="history" />}
      </div>
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
      <h1 className="title"><span className="title-text">Admin</span></h1>
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

function PrefsPanel({ user }) {
  const uid = user.uid
  const [jmeno, setJmeno] = useState('')
  const [jmenoPartnera, setJmenoPartnera] = useState('')
  const [pohlavi, setPohlavi] = useState('')
  const [pohlaviPartnera, setPohlaviPartnera] = useState('')
  const [osloveniPartnera, setOsloveniPartnera] = useState('')
  const [aktivity, setAktivity] = useState([])
  const [editing, setEditing] = useState(null) // {idx, emoji, label}
  const [newEmoji, setNewEmoji] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    getDoc(doc(db, 'users', uid)).then((snap) => {
      const seed = ACTIVITIES.map((a) => ({ ...a, active: true }))
      if (snap.exists()) {
        const d = snap.data()
        setJmeno(d.jmeno || '')
        setJmenoPartnera(d.jmeno_partnera || '')
        setPohlavi(d.pohlavi || '')
        setPohlaviPartnera(d.pohlavi_partnera || '')
        setOsloveniPartnera(d.osloveni_partnera || '')

        if (d.aktivity?.length) {
          setAktivity(d.aktivity)
        } else if (d.vlastni_aktivity?.length || d.oblibene_aktivity?.length) {
          // migrate from old vlastni_aktivity + oblibene_aktivity
          const oblibene = d.oblibene_aktivity || []
          const vlastni = (d.vlastni_aktivity || []).map((a) => ({
            ...a, id: a.id || `ca_${a.label}`, active: oblibene.length === 0 || oblibene.includes(a.id || a.label),
          }))
          const defaults = seed.map((a) => ({
            ...a, active: oblibene.length === 0 || oblibene.includes(a.id),
          }))
          setAktivity([...defaults, ...vlastni])
        } else {
          setAktivity(seed)
        }
      } else {
        setAktivity(seed)
      }
      setLoaded(true)
    }).catch((e) => {
      console.error('PrefsPanel load failed:', e.code || e.message)
      setAktivity(ACTIVITIES.map((a) => ({ ...a, active: true })))
      setLoaded(true)
    })
  }, [uid])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await setDoc(doc(db, 'users', uid), {
        jmeno, jmeno_partnera: jmenoPartnera,
        pohlavi, pohlavi_partnera: pohlaviPartnera,
        osloveni_partnera: osloveniPartnera,
        aktivity,
        email: user.email || '',
        photoURL: user.photoURL || '',
        updated: serverTimestamp(),
      }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError('Uložení selhalo: ' + (e.message || e.code || 'neznámá chyba'))
    } finally {
      setSaving(false)
    }
  }

  function toggleAktivita(id) {
    setAktivity((prev) => prev.map((a) => a.id === id ? { ...a, active: !a.active } : a))
  }

  function deleteAktivita(idx) {
    setAktivity((prev) => prev.filter((_, i) => i !== idx))
  }

  function startEdit(idx) {
    const a = aktivity[idx]
    setEditing({ idx, emoji: a.emoji || '', label: a.label })
  }

  function saveEdit() {
    if (!editing || !editing.label.trim()) return
    setAktivity((prev) => prev.map((a, i) =>
      i === editing.idx ? { ...a, emoji: editing.emoji.trim(), label: editing.label.trim() } : a
    ))
    setEditing(null)
  }

  function addAktivita() {
    const label = newLabel.trim()
    if (!label) return
    setAktivity((prev) => [...prev, { id: `ca_${Date.now()}`, emoji: newEmoji.trim(), label, active: true }])
    setNewEmoji('')
    setNewLabel('')
  }

  if (!loaded) return <MiniLoader />

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
        <label className="pref-label">🗣️ Oslovení partnera v dopise</label>
        <p className="pref-hint">
          Přesné oslovení v 5. pádu — auto-doplní se při tvorbě pozvánky
        </p>
        <input className="input" style={{ marginTop: 0 }} type="text"
          placeholder="Milá Terezko, Milý Karle, lásko…"
          value={osloveniPartnera}
          onChange={(e) => setOsloveniPartnera(e.target.value)} />
      </div>

      <div className="pref-section">
        <label className="pref-label">💞 Aktivity v planneru</label>
        <p className="pref-hint">Zaškrtnuté se zobrazí jako chips v planneru. Uprav nebo smaž libovolnou.</p>
        <div className="act-list">
          {aktivity.map((a, i) => {
            if (editing && editing.idx === i) {
              return (
                <div key={a.id} className="act-list-row editing">
                  <input
                    className="input act-edit-emoji"
                    value={editing.emoji}
                    placeholder="🎾"
                    onChange={(e) => setEditing((ed) => ({ ...ed, emoji: e.target.value }))}
                  />
                  <input
                    className="input act-edit-label"
                    value={editing.label}
                    placeholder="Název aktivity"
                    autoFocus
                    onChange={(e) => setEditing((ed) => ({ ...ed, label: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null) }}
                  />
                  <button className="act-edit-confirm" onClick={saveEdit} disabled={!editing.label.trim()}>✓</button>
                  <button className="act-edit-cancel" onClick={() => setEditing(null)}>✗</button>
                </div>
              )
            }
            return (
              <div key={a.id} className={`act-list-row${a.active !== false ? ' on' : ''}`}>
                <button className="act-toggle" onClick={() => toggleAktivita(a.id)}>
                  {a.active !== false ? '✓' : ''}
                </button>
                <span className="act-list-emoji">{a.emoji}</span>
                <span className="act-list-label">{a.label}</span>
                <button className="act-list-btn" onClick={() => startEdit(i)} aria-label="Upravit">✎</button>
                <button className="act-list-btn del" onClick={() => deleteAktivita(i)} aria-label="Smazat">×</button>
              </div>
            )
          })}
        </div>
        <div className="custom-act-form" style={{ marginTop: 12 }}>
          <input
            className="input custom-act-emoji-input"
            type="text"
            placeholder="🎾"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
          />
          <input
            className="input custom-act-label-input"
            type="text"
            placeholder="Název aktivity"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAktivita()}
          />
          <button
            className="custom-act-add-btn"
            onClick={addAktivita}
            disabled={!newLabel.trim()}
          >+ Přidat</button>
        </div>
      </div>

      <button className="cta" onClick={handleSave} disabled={saving}>
        {saved ? 'Uloženo ✓' : saving ? 'Ukládám…' : 'Uložit preference'}
      </button>
      {saveError && <p className="error" style={{ marginTop: 10 }}>{saveError}</p>}
    </div>
  )
}

function FriendsPanel({ user }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey((k) => k + 1)

  const [contacts, setContacts] = useState([])
  const [pending, setPending] = useState([])
  const [panelLoading, setPanelLoading] = useState(true)

  const [searchEmail, setSearchEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState(null)

  useEffect(() => {
    setPanelLoading(true)
    Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDocs(query(collection(db, 'friend_requests'), where('to_uid', '==', user.uid))),
      getDocs(query(collection(db, 'friend_requests'), where('from_uid', '==', user.uid))),
    ]).then(async ([userSnap, receivedSnap, sentSnap]) => {
      const existingContacts = userSnap.data()?.contacts || []

      setPending(receivedSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.status === 'pending'))

      // Auto-sync accepted sent requests into own contacts
      const acceptedSent = sentSnap.docs
        .map((d) => d.data())
        .filter((r) => r.status === 'accepted' && !existingContacts.some((c) => c.uid === r.to_uid))

      if (acceptedSent.length > 0) {
        const merged = [
          ...existingContacts,
          ...acceptedSent.map((r) => ({ uid: r.to_uid, jmeno: r.to_name || '', email: r.to_email || '', photoURL: r.to_photo || '' })),
        ]
        await updateDoc(doc(db, 'users', user.uid), { contacts: merged }).catch(() => {})
        setContacts(merged)
      } else {
        setContacts(existingContacts)
      }

      setPanelLoading(false)
    }).catch(() => setPanelLoading(false))
  }, [user.uid, refreshKey])

  async function handleSearch() {
    const email = searchEmail.trim().toLowerCase()
    if (!email) return
    setSearching(true)
    setSearchResult(null)

    if (email === user.email?.toLowerCase()) { setSearchResult({ type: 'self' }); setSearching(false); return }
    if (contacts.some((c) => c.email?.toLowerCase() === email)) { setSearchResult({ type: 'already_friend' }); setSearching(false); return }

    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)))
    if (snap.empty) {
      setSearchResult({ type: 'not_found' })
    } else {
      const found = { uid: snap.docs[0].id, ...snap.docs[0].data() }
      const existingReq = await getDocs(query(collection(db, 'friend_requests'), where('from_uid', '==', user.uid)))
      const alreadySent = existingReq.docs.some((d) => {
        const r = d.data()
        return r.to_uid === found.uid && r.status === 'pending'
      })
      setSearchResult(alreadySent ? { type: 'already_sent' } : { type: 'found', user: found })
    }
    setSearching(false)
  }

  async function sendRequest() {
    if (searchResult?.type !== 'found') return
    const toUser = searchResult.user
    const mySnap = await getDoc(doc(db, 'users', user.uid))
    const myJmeno = mySnap.data()?.jmeno || user.displayName || ''

    await addDoc(collection(db, 'friend_requests'), {
      from_uid: user.uid,
      from_name: myJmeno,
      from_email: user.email || '',
      from_photo: user.photoURL || '',
      to_uid: toUser.uid,
      to_name: toUser.jmeno || '',
      to_email: toUser.email || '',
      to_photo: toUser.photoURL || '',
      status: 'pending',
      created: serverTimestamp(),
    })
    setSearchResult({ type: 'sent' })
  }

  async function acceptRequest(req) {
    const mySnap = await getDoc(doc(db, 'users', user.uid))
    const myContacts = mySnap.data()?.contacts || []
    const newContact = { uid: req.from_uid, jmeno: req.from_name, email: req.from_email, photoURL: req.from_photo }

    const updates = [updateDoc(doc(db, 'friend_requests', req.id), { status: 'accepted' })]
    if (!myContacts.some((c) => c.uid === req.from_uid))
      updates.push(updateDoc(doc(db, 'users', user.uid), { contacts: [...myContacts, newContact] }))
    await Promise.all(updates)
    refresh()
  }

  async function declineRequest(req) {
    await deleteDoc(doc(db, 'friend_requests', req.id))
    refresh()
  }

  async function removeContact(contact) {
    const mySnap = await getDoc(doc(db, 'users', user.uid))
    const updated = (mySnap.data()?.contacts || []).filter((c) => c.uid !== contact.uid)
    await updateDoc(doc(db, 'users', user.uid), { contacts: updated })
    refresh()
  }

  if (panelLoading) return <MiniLoader />

  return (
    <div className="friends-panel">
      {pending.length > 0 && (
        <div className="pref-section">
          <label className="pref-label">📬 Žádosti o spojení</label>
          <div className="friends-list">
            {pending.map((req) => (
              <div key={req.id} className="friend-item">
                {req.from_photo
                  ? <img src={req.from_photo} className="friend-avatar" alt="" referrerPolicy="no-referrer" />
                  : <span className="friend-avatar-ph">👤</span>}
                <div className="friend-info">
                  <span className="friend-name">{req.from_name || req.from_email}</span>
                  <span className="friend-email">{req.from_email}</span>
                </div>
                <div className="friend-req-btns">
                  <button className="friend-accept-btn" onClick={() => acceptRequest(req)}>✓ Přijmout</button>
                  <button className="friend-decline-btn" onClick={() => declineRequest(req)}>× Odmítnout</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pref-section">
        <label className="pref-label">🔍 Najít přítele / partnera</label>
        <p className="pref-hint">Zadej emailovou adresu Google účtu</p>
        <div className="friends-search-row">
          <input
            className="input" style={{ margin: 0, flex: 1 }}
            type="email" placeholder="email@gmail.com"
            value={searchEmail}
            onChange={(e) => { setSearchEmail(e.target.value); setSearchResult(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="friends-search-btn" onClick={handleSearch} disabled={!searchEmail.trim() || searching}>
            {searching ? '…' : 'Hledat'}
          </button>
        </div>
        {searchResult?.type === 'not_found'     && <p className="friends-msg">Uživatel nenalezen — partner se musí nejdřív přihlásit do Randio.</p>}
        {searchResult?.type === 'self'          && <p className="friends-msg">To jsi ty 😄</p>}
        {searchResult?.type === 'already_friend'&& <p className="friends-msg">Tento uživatel je už v tvém seznamu.</p>}
        {searchResult?.type === 'already_sent'  && <p className="friends-msg">Žádost čeká na přijetí 🕐</p>}
        {searchResult?.type === 'sent'          && <p className="friends-msg ok">Žádost odeslána ✓</p>}
        {searchResult?.type === 'found' && (
          <div className="friend-found-card">
            {searchResult.user.photoURL
              ? <img src={searchResult.user.photoURL} className="friend-avatar" alt="" referrerPolicy="no-referrer" />
              : <span className="friend-avatar-ph">👤</span>}
            <div className="friend-info">
              <span className="friend-name">{searchResult.user.jmeno || searchResult.user.email}</span>
              <span className="friend-email">{searchResult.user.email}</span>
            </div>
            <button className="friend-add-btn" onClick={sendRequest}>+ Přidat</button>
          </div>
        )}
      </div>

      <div className="pref-section">
        <label className="pref-label">💑 Moji přátelé</label>
        {contacts.length === 0
          ? <p className="pref-hint">Zatím žádní přátelé. Přidej je pomocí emailu výše.</p>
          : (
            <div className="friends-list">
              {contacts.map((c) => (
                <div key={c.uid} className="friend-item">
                  {c.photoURL
                    ? <img src={c.photoURL} className="friend-avatar" alt="" referrerPolicy="no-referrer" />
                    : <span className="friend-avatar-ph">👤</span>}
                  <div className="friend-info">
                    <span className="friend-name">{c.jmeno || c.email}</span>
                    <span className="friend-email">{c.email}</span>
                  </div>
                  <button className="friend-remove-btn" onClick={() => removeContact(c)} aria-label="Odebrat">×</button>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}

function InviteList({ uid, filter }) {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, 'rande'), where('uid', '==', uid))),
      getDocs(query(collection(db, 'rande'), where('uid_prijemce', '==', uid))),
    ]).then(([sentSnap, receivedSnap]) => {
      const sent = sentSnap.docs.map((d) => ({ id: d.id, ...d.data(), _role: 'sent' }))
      const sentIds = new Set(sent.map((d) => d.id))
      const received = receivedSnap.docs
        .filter((d) => !sentIds.has(d.id))
        .map((d) => ({ id: d.id, ...d.data(), _role: 'received' }))
      const all = [...sent, ...received]
      all.sort((a, b) => (b.vytvoreno?.seconds || 0) - (a.vytvoreno?.seconds || 0))
      setInvites(all)
      setLoading(false)
    })
  }, [uid])

  if (loading) return <MiniLoader />

  const filtered = filter === 'active'
    ? invites.filter((i) => i.stav !== 'potvrzeno')
    : invites.filter((i) => i.stav === 'potvrzeno')

  if (filtered.length === 0) {
    return filter === 'active' ? (
      <div className="invite-empty">
        <span className="invite-empty-icon">💌</span>
        <p className="invite-empty-title">Žádná čekající randíčka</p>
        <p className="invite-empty-sub">Odešli pozvánku a uvidíš ji tady, jakmile ji příjemce otevře.</p>
        <a href={baseUrl()} className="invite-empty-cta">Vytvořit pozvánku →</a>
      </div>
    ) : (
      <div className="invite-empty">
        <span className="invite-empty-icon">✨</span>
        <p className="invite-empty-title">Žádná potvrzená randíčka</p>
        <p className="invite-empty-sub">Potvrzené rande se přesune sem jako krásná vzpomínka.</p>
      </div>
    )
  }

  return (
    <div className="invite-list">
      {filtered.map((inv) => (
        <InviteItem
          key={inv.id}
          invite={inv}
          onDelete={() => setInvites((prev) => prev.filter((i) => i.id !== inv.id))}
        />
      ))}
    </div>
  )
}

function InviteItem({ invite, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isReceived = invite._role === 'received'

  const known = findAct(invite.aktivita)
  const label = known ? `${known.emoji} ${known.label}` : invite.aktivita
  const dateStr = invite.datum ? fmtDate(parseDate(invite.datum)) : '—'
  const stavLabel = {
    navrh: 'čeká na odpověď',
    protinavrh: 'protinávrh',
    potvrzeno: 'potvrzeno ✓',
  }[invite.stav] || invite.stav

  async function handleDelete() {
    setDeleting(true)
    await deleteDoc(doc(db, 'rande', invite.id))
    onDelete()
  }

  async function handleUnlink() {
    setDeleting(true)
    await updateDoc(doc(db, 'rande', invite.id), { uid_prijemce: deleteField() })
    onDelete()
  }

  return (
    <div className="invite-item">
      <div className="invite-item-top">
        <span className="invite-activity">{label}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`invite-role-chip${isReceived ? ' received' : ''}`}>
            {isReceived ? '📥 Přijatá' : '📤 Odeslaná'}
          </span>
          <span className={`badge ${invite.stav}`}>{stavLabel}</span>
        </div>
      </div>
      <div className="invite-item-bottom">
        <span className="invite-date">📅 {dateStr} · 🕐 {invite.cas}</span>
        {isReceived
          ? invite.od && <span className="invite-komu">Od: {invite.od}</span>
          : invite.komu && <span className="invite-komu">→ {invite.komu}</span>
        }
        <a href={`${baseUrl()}?id=${invite.id}`} className="invite-link">Otevřít →</a>
      </div>
      <div className="invite-item-actions">
        {confirming ? (
          <>
            <span className="invite-del-hint">{isReceived ? 'Odebrat z profilu?' : 'Opravdu smazat?'}</span>
            <button className="invite-del-confirm" onClick={isReceived ? handleUnlink : handleDelete} disabled={deleting}>
              {deleting ? '…' : isReceived ? 'Odebrat' : 'Smazat'}
            </button>
            <button className="invite-del-cancel" onClick={() => setConfirming(false)}>Zrušit</button>
          </>
        ) : (
          <button className="invite-del-btn" onClick={() => setConfirming(true)}>
            {isReceived ? '× Odebrat z profilu' : '🗑 Smazat'}
          </button>
        )}
      </div>
    </div>
  )
}

function LoaderHeart() {
  return (
    <svg className="loader-heart-svg" viewBox="0 0 32 29.6" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ahg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9e1a45"/>
          <stop offset="45%" stopColor="#d8366c"/>
          <stop offset="100%" stopColor="#c2185b"/>
        </linearGradient>
      </defs>
      <path fill="url(#ahg)" d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4
        c0,9.4,9.5,11.9,16,21.2c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z"/>
    </svg>
  )
}

function MiniLoader() {
  return (
    <div className="mini-loader">
      <div className="loader-heart-wrap loader-heart-wrap--sm"><LoaderHeart /></div>
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
