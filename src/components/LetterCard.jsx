import { useState } from 'react'
import { findAct, parseDate, fmtDate, countdownCompact, mapsUrl } from '../utils'
import { DAYS, MONTHS_GEN } from '../constants'

export default function LetterCard({ plan, selectedOpt, onSelectOpt, onConfirm, onEdit, isCreator, onSendReply }) {
  const [replyText, setReplyText] = useState('')

  if (!plan) return null

  const known = findAct(plan.aktivita)
  let label = known ? known.label : plan.aktivita
  let displayEmoji = known ? known.emoji : null
  if (!known && plan.aktivita_emoji) {
    displayEmoji = plan.aktivita_emoji
    label = plan.aktivita.replace(plan.aktivita_emoji, '').trim()
  }

  const datumOptions = plan.datumOptions || [plan.datum]
  const multiChoice = datumOptions.length > 1 && plan.stav !== 'potvrzeno'
  const confirmDisabled = multiChoice && !selectedOpt

  let salutation
  if (plan.stav === 'potvrzeno') {
    const kdo = plan.komu || plan.potvrdil
    salutation = kdo ? `${kdo} jde do toho! 🎉` : 'Rande potvrzeno! 🎉'
  } else if (plan.osloveni_komu) {
    salutation = plan.od
      ? `${plan.osloveni_komu}, ${plan.od} tě zve na rande!`
      : `${plan.osloveni_komu},`
  } else if (plan.komu) {
    salutation = plan.od
      ? `Milá/ý ${plan.komu}, ${plan.od} tě zve na rande!`
      : `Milá/ý ${plan.komu},`
  } else {
    salutation = plan.od ? `${plan.od} tě zve na rande!` : 'Máš pozvánku na rande!'
  }

  const activeDatum = selectedOpt || plan.datum
  const compact = activeDatum ? countdownCompact(activeDatum) : null
  const showCountdown = compact && (!multiChoice || selectedOpt)

  const datumToShow = multiChoice ? null : plan.datum
  const metaRows = []
  if (datumToShow) metaRows.push({ icon: '📅', text: fmtDate(parseDate(datumToShow)), link: null })
  metaRows.push({ icon: '🕐', text: plan.cas, link: null })
  if (plan.misto) metaRows.push({ icon: '📍', text: plan.misto, link: mapsUrl(plan.misto) })

  let badgeText, badgeClass
  if (plan.stav === 'potvrzeno') {
    badgeText = 'potvrzeno ✓'; badgeClass = 'badge potvrzeno'
  } else if (plan.stav === 'protinavrh') {
    badgeText = 'protinávrh — čeká na odpověď'; badgeClass = 'badge protinavrh'
  } else {
    badgeText = 'čeká na odpověď'; badgeClass = 'badge navrh'
  }

  function handleSend() {
    const txt = replyText.trim()
    if (!txt) return
    onSendReply(txt)
    setReplyText('')
  }

  return (
    <div className={`letter-card${plan.stav === 'potvrzeno' ? ' confetti-burst' : ''}`}>

      {showCountdown && <span className="countdown-chip">{compact}</span>}

      <p className="letter-salutation">{salutation}</p>
      <p className="letter-activity">
        {displayEmoji && <span className="em">{displayEmoji}</span>}{label}
      </p>

      {multiChoice && (
        <div>
          <p className="date-opts-label">Vyber termín, který ti nejlépe vyhovuje:</p>
          <div className="date-opts">
            {datumOptions.map((opt) => {
              const d = parseDate(opt)
              return (
                <button
                  key={opt}
                  className={`date-opt${selectedOpt === opt ? ' sel' : ''}`}
                  onClick={() => onSelectOpt(opt)}
                >
                  <span className="dow">{DAYS[d.getDay()]}</span>
                  {d.getDate()}. {MONTHS_GEN[d.getMonth()]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="letter-meta">
        {metaRows.map(({ icon, text, link }) => (
          <div key={icon} className="letter-meta-row">
            <strong>{icon}</strong>
            <span>
              {link ? <a href={link} target="_blank" rel="noopener">{text}</a> : text}
            </span>
          </div>
        ))}
      </div>

      {plan.zprava && (
        <div className="chat-bubble-wrap sent">
          {plan.od && <span className="chat-label">{plan.od}</span>}
          <div className="chat-bubble sent">{plan.zprava}</div>
        </div>
      )}

      {plan.odpoved && (
        <div className="chat-bubble-wrap received">
          {plan.komu && <span className="chat-label">{plan.komu}</span>}
          <div className="chat-bubble reply">{plan.odpoved}</div>
        </div>
      )}

      {!isCreator && !plan.odpoved && plan.stav !== 'potvrzeno' && (
        <div className="chat-input-row">
          <input
            className="input"
            style={{ margin: 0 }}
            type="text"
            placeholder="Napiš odpověď…"
            maxLength={200}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="chat-send-btn" disabled={!replyText.trim()} onClick={handleSend}>
            Odeslat
          </button>
        </div>
      )}

      <hr className="letter-divider" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span className={badgeClass}>{badgeText}</span>
        {plan.od && <p className="letter-sign" style={{ margin: 0 }}>— {plan.od}</p>}
      </div>

      {plan.stav !== 'potvrzeno' && (
        <div className="row">
          <button className="primary" disabled={confirmDisabled} onClick={onConfirm}>
            Jdu do toho! 💗
          </button>
          <button className="secondary" onClick={onEdit}>
            ✏️ Upravit podle sebe
          </button>
        </div>
      )}
    </div>
  )
}
