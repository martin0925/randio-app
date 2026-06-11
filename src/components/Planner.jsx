import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, updateDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '../firebase'
import { requestAndStorePush } from '../usePush'
import { ACTIVITIES, TIMES, DAYS, MONTHS_GEN, MONTHS } from '../constants'
import { pad, fmtD, parseDate, findAct, baseUrl } from '../utils'
import ClockPicker from './ClockPicker'

export default function Planner({ editDoc = null, prefill = null, onEditDone = null }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function initState() {
    if (!prefill) {
      return {
        dates: [],
        time: null,
        customTime: '',
        act: null,
        customAct: '',
        calView: { y: today.getFullYear(), m: today.getMonth() },
        od: '',
        komu: '',
        osloveni_komu: '',
        misto: '',
        zprava: '',
      }
    }
    const opts = prefill.datumOptions || (prefill.datum ? [prefill.datum] : [])
    const dates = opts.map(parseDate).filter((d) => d >= today)
    let time = null, customTime = ''
    if (TIMES.includes(prefill.cas)) time = prefill.cas
    else customTime = prefill.cas || ''
    let act = null, customAct = ''
    if (findAct(prefill.aktivita)) act = prefill.aktivita
    else customAct = prefill.aktivita || ''
    const firstDate = dates[0] || today
    return {
      dates,
      time,
      customTime,
      act,
      customAct,
      calView: { y: firstDate.getFullYear(), m: firstDate.getMonth() },
      od: prefill.od || '',
      komu: prefill.komu || '',
      osloveni_komu: prefill.osloveni_komu || '',
      misto: prefill.misto || '',
      zprava: prefill.zprava || '',
    }
  }

  const [state, setState] = useState(initState)
  const [currentUser, setCurrentUser] = useState(auth.currentUser)
  const currentUserRef = useRef(auth.currentUser)

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      currentUserRef.current = user
      setCurrentUser(user)
      if (editDoc || !user) return
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (!snap.exists()) return
      const prefs = snap.data()
      setState((s) => ({
        ...s,
        od:            s.od            || prefs.jmeno              || '',
        komu:          s.komu          || prefs.jmeno_partnera     || '',
        osloveni_komu: s.osloveni_komu || prefs.osloveni_partnera  || '',
      }))
      if (prefs.aktivity?.length) {
        setPlannerActs(prefs.aktivity.filter((a) => a.active !== false))
      } else if (prefs.vlastni_aktivity?.length || prefs.oblibene_aktivity?.length) {
        // migrate from old format
        const oblibene = prefs.oblibene_aktivity || []
        const all = [
          ...ACTIVITIES,
          ...(prefs.vlastni_aktivity || []).map((a) => ({ ...a, id: a.id || a.label })),
        ]
        setPlannerActs(oblibene.length > 0 ? all.filter((a) => oblibene.includes(a.id)) : all)
      }
    })
  }, [editDoc])

  const [plannerActs, setPlannerActs] = useState(null)
  const [success, setSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [shareUrl, setShareUrl] = useState(null)
  const [shareText, setShareText] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const { dates, time, customTime, act, customAct, calView, od, komu, osloveni_komu, misto, zprava } = state

  const chosenTime = () => customTime || time
  const chosenAct = () => customAct.trim() || act
  const chosenDates = () => [...dates].sort((a, b) => a - b)


  const hasDates = dates.length > 0
  const ready = hasDates && chosenTime() && chosenAct()

  let sendLabel = 'Vyber datum, čas a aktivitu'
  if (ready) {
    if (editDoc) {
      sendLabel = 'Odeslat protinávrh 💌'
    } else {
      sendLabel = dates.length > 1
        ? `Vytvořit návrh s ${dates.length} termíny 💌`
        : 'Vytvořit a poslat návrh 💌'
    }
  }

  function handleCopy() {
    if (!shareUrl) return
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    })
  }

  function handleReset() {
    setState(initState())
    setSuccess(false)
    setSuccessMsg('')
    setShareUrl(null)
    setShareText('')
    setError(null)
    setCopied(false)
  }

  function toggleDate(date) {
    setState((s) => {
      const idx = s.dates.findIndex((x) => x.getTime() === date.getTime())
      if (idx >= 0) {
        return { ...s, dates: s.dates.filter((_, i) => i !== idx) }
      } else if (s.dates.length < 3) {
        return { ...s, dates: [...s.dates, date] }
      }
      return s
    })
  }

  function removeDate(date) {
    setState((s) => ({ ...s, dates: s.dates.filter((d) => d.getTime() !== date.getTime()) }))
  }

  const calHint = () => {
    const n = dates.length
    if (n === 0) return 'Klikni na datum — nebo vyber až 3 termíny pro příjemce na výběr'
    if (n === 1) return 'Chceš nabídnout víc termínů? Klikni na další datum (max 3)'
    if (n < 3) return `${n} termíny vybrány — můžeš přidat ještě ${3 - n}`
    return '3 termíny vybrány (maximum)'
  }

  async function handleSubmit() {
    if (!ready) return
    setSubmitting(true)
    setError(null)
    const sorted = chosenDates()
    const plan = {
      datum: fmtD(sorted[0]),
      datumOptions: sorted.map(fmtD),
      cas: chosenTime(),
      aktivita: chosenAct(),
      od: od.trim(),
      komu: komu.trim(),
      osloveni_komu: osloveni_komu.trim(),
      misto: misto.trim(),
      zprava: zprava.trim(),
    }

    try {
      if (editDoc) {
        const isCreatorEdit = localStorage.getItem(`creator_${editDoc.id}`) === '1'
        await updateDoc(editDoc, {
          ...plan,
          stav: 'protinavrh',
          upraveno_kdy: serverTimestamp(),
          upravil: isCreatorEdit ? 'tvurce' : 'prijemce',
        })
        setSuccessMsg('Protinávrh uložen ✓ Druhá strana ho uvidí na stejném odkazu.')
        setSuccess(true)
        setTimeout(() => {
          if (onEditDone) onEditDone()
        }, 1200)
      } else {
        const docRef = await addDoc(collection(db, 'rande'), {
          ...plan,
          stav: 'navrh',
          vytvoreno: serverTimestamp(),
          ...(currentUserRef.current ? { uid: currentUserRef.current.uid } : {}),
        })
        localStorage.setItem(`creator_${docRef.id}`, '1')
        requestAndStorePush(docRef.id, 'fcm_creator')
        const url = `${baseUrl()}?id=${docRef.id}`
        const txt = plan.od ? `${plan.od} tě zve na rande!` : 'Pozvi svou lásku na rande 💗'
        setShareUrl(url)
        setShareText(txt)
        setSuccessMsg(`Zkopíruj a pošli: ${url}`)
        setSuccess(true)
      }
    } catch (e) {
      setError('Uložení se nepodařilo: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Calendar grid
  const firstOfMonth = new Date(calView.y, calView.m, 1)
  const offset = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(calView.y, calView.m + 1, 0).getDate()

  const calDays = []
  for (let i = 0; i < offset; i++) calDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    calDays.push(new Date(calView.y, calView.m, d))
  }

  function prevMonth() {
    setState((s) => {
      const { y, m } = s.calView
      return { ...s, calView: m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 } }
    })
  }
  function nextMonth() {
    setState((s) => {
      const { y, m } = s.calView
      return { ...s, calView: m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 } }
    })
  }

  const title = editDoc ? 'Uprav rande podle sebe' : 'Naplánuj rande'
  const subtitle = editDoc
    ? 'Změň, co se ti nehodí, a odešli protinávrh 💌'
    : 'Vyber datum, čas a aktivitu — pak pošli odkaz 💌'

  return (
    <>
      {!editDoc && (
        <div className="planner-topbar">
          <a href={`${baseUrl()}?admin`} className="planner-user-btn" aria-label="Účet / Admin">
            {currentUser?.photoURL
              ? <img src={currentUser.photoURL} alt="" className="planner-user-avatar" referrerPolicy="no-referrer" />
              : <span className="planner-user-icon">👤</span>
            }
          </a>
        </div>
      )}
      <h1 className="title"><span className="title-text">{title}</span></h1>
      <p className="sub">{subtitle}</p>

      {/* Calendar */}
      <section className="section">
        <h2 className="label">📅 Kdy se uvidíme?</h2>
        <div className="cal-head">
          <button className="nav" aria-label="Předchozí měsíc" onClick={prevMonth}>‹</button>
          <span className="cal-title">{MONTHS[calView.m]} {calView.y}</span>
          <button className="nav" aria-label="Další měsíc" onClick={nextMonth}>›</button>
        </div>
        <div className="grid">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((d) => (
            <span key={d} className="dow">{d}</span>
          ))}
          {calDays.map((date, i) =>
            date ? (
              <button
                key={i}
                className={`day${dates.some((x) => x.getTime() === date.getTime()) ? ' sel' : ''}`}
                disabled={date < today}
                onClick={() => toggleDate(date)}
              >
                {date.getDate()}
              </button>
            ) : (
              <span key={i} />
            )
          )}
        </div>
        <p className="cal-hint">{calHint()}</p>
        <div className="sel-dates">
          {chosenDates().map((date) => (
            <div key={date.getTime()} className="sel-date-chip">
              {DAYS[date.getDay()]} {date.getDate()}. {MONTHS_GEN[date.getMonth()]}
              <button aria-label="Odebrat" onClick={() => removeDate(date)}>×</button>
            </div>
          ))}
        </div>
      </section>

      {/* Time */}
      <section className="section">
        <h2 className="label">
          🕐 V kolik hodin?
          {chosenTime() && <span className="time-selected-label">{chosenTime()}</span>}
        </h2>
        <div className="chips" style={{ marginBottom: 4 }}>
          {TIMES.map((t) => (
            <button
              key={t}
              className={`chip${!customTime && time === t ? ' sel' : ''}`}
              onClick={() => setState((s) => ({ ...s, time: t, customTime: '' }))}
            >{t}</button>
          ))}
        </div>
        <ClockPicker
          value={customTime || null}
          onChange={(v) => setState((s) => ({ ...s, customTime: v, time: null }))}
        />
      </section>

      {/* Activity */}
      <section className="section">
        <h2 className="label">💞 Co podnikneme?</h2>
        <div className="acts">
          {(plannerActs ?? ACTIVITIES).map((a) => {
            const isBuiltin = ACTIVITIES.some((x) => x.id === a.id)
            const fullText = isBuiltin ? null : [a.emoji, a.label].filter(Boolean).join(' ')
            const isSelected = isBuiltin
              ? (!customAct.trim() && act === a.id)
              : (!act && customAct === fullText)
            return (
              <button
                key={a.id}
                className={`act${isSelected ? ' sel' : ''}`}
                onClick={() => isBuiltin
                  ? setState((s) => ({ ...s, act: a.id, customAct: '' }))
                  : setState((s) => ({ ...s, act: null, customAct: fullText }))
                }
              >
                {a.emoji && <span className="em">{a.emoji}</span>}{a.label}
              </button>
            )
          })}
        </div>
        <input
          className="input"
          type="text"
          placeholder="…nebo napiš vlastní nápad"
          value={customAct}
          onChange={(e) => setState((s) => ({ ...s, customAct: e.target.value, act: null }))}
        />
      </section>

      {/* Location */}
      <section className="section">
        <h2 className="label">
          📍 Kde se uvidíme? <span className="optional">(nepovinné)</span>
        </h2>
        <input
          className="input"
          style={{ marginTop: 0 }}
          type="text"
          placeholder="Název restaurace, parku, adresy…"
          value={misto}
          onChange={(e) => setState((s) => ({ ...s, misto: e.target.value }))}
        />
      </section>

      {/* Who */}
      <section className="section">
        <h2 className="label">💌 Od koho / Komu? <span className="optional">(nepovinné)</span></h2>
        <div className="who-grid">
          <div className="who-field">
            <span className="who-label">Tvoje jméno</span>
            <input
              className="input"
              style={{ marginTop: 4 }}
              type="text"
              placeholder="Tvoje jméno"
              value={od}
              onChange={(e) => setState((s) => ({ ...s, od: e.target.value }))}
            />
          </div>
          <div className="who-field">
            <span className="who-label">Komu píšeš?</span>
            <input
              className="input"
              style={{ marginTop: 4 }}
              type="text"
              placeholder="Jméno příjemce"
              value={komu}
              onChange={(e) => setState((s) => ({ ...s, komu: e.target.value }))}
            />
          </div>
        </div>
        <div className="who-field" style={{ marginTop: 10 }}>
          <span className="who-label">Oslovení v dopise <span className="optional">(5. pád — místo „Milá/ý jméno")</span></span>
          <input
            className="input"
            style={{ marginTop: 4 }}
            type="text"
            placeholder="Milá Terezko, Milý Karle, lásko…"
            value={osloveni_komu}
            onChange={(e) => setState((s) => ({ ...s, osloveni_komu: e.target.value }))}
          />
        </div>
      </section>

      {/* Message */}
      <section className="section">
        <h2 className="label">
          💬 Osobní zpráva <span className="optional">(nepovinné)</span>
        </h2>
        <textarea
          className="input"
          placeholder="Napiš pár slov ze srdce…"
          maxLength={300}
          value={zprava}
          onChange={(e) => setState((s) => ({ ...s, zprava: e.target.value }))}
        />
      </section>

      {!success && (
        <div className="cta-checklist">
          <span className={`cta-check${hasDates ? ' ok' : ''}`}>📅 {hasDates ? '✓' : '✗'}</span>
          <span className={`cta-check${chosenTime() ? ' ok' : ''}`}>🕐 {chosenTime() ? '✓' : '✗'}</span>
          <span className={`cta-check${chosenAct() ? ' ok' : ''}`}>💞 {chosenAct() ? '✓' : '✗'}</span>
        </div>
      )}

      <button
        className="cta"
        disabled={!ready || submitting || success}
        onClick={handleSubmit}
      >
        {success ? (editDoc ? 'Protinávrh odeslán ✓' : 'Návrh vytvořen ✓') : sendLabel}
      </button>

      {success && !editDoc && shareUrl && (
        <div className="success-card">
          <span className="success-icon">💌</span>
          <p className="success-title">Pozvánka je připravena!</p>
          <p className="success-hint">
            {komu.trim() ? `Zkopíruj odkaz a pošli ho ${komu.trim()}` : 'Zkopíruj odkaz a pošli ho své lásce'}
          </p>
          <div className="success-url-row">
            <input
              className="success-url-input"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.target.select()}
            />
            <button
              className={`success-copy-btn${copied ? ' copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ Zkopírováno' : '📋 Kopírovat'}
            </button>
          </div>
          <button className="success-new-btn" onClick={handleReset}>
            ✨ Naplánovat nové rande
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

    </>
  )
}
