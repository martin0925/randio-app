import { useState } from 'react'
import './EnvelopeView.css'

export default function EnvelopeView({ onOpen }) {
  const [sealHidden, setSealHidden] = useState(false)
  const [flapOpen, setFlapOpen] = useState(false)
  const [letterOpen, setLetterOpen] = useState(false)
  const [opened, setOpened] = useState(false)

  function handleOpen() {
    if (opened) return
    setOpened(true)
    setSealHidden(true)
    setTimeout(() => setFlapOpen(true), 150)    // klopa: 0.65 s → hotovo ~800 ms
    setTimeout(() => setLetterOpen(true), 900)  // dopis vyjíždí po otevření klopy
    setTimeout(() => onOpen(), 1850)            // konec přechodu
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpen()
    }
  }

  return (
    <div id="envelopeView">
      <h1 className="title" style={{ marginBottom: '8px' }}>Máš poštu 💌</h1>
      <p className="sub">Někdo ti poslal pozvánku na rande</p>

      <div
        className="env-scene"
        role="button"
        aria-label="Otevřít pozvánku"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
      >
        {/* 1) Zadní stěna + vnitřek obálky (za dopisem) */}
        <div className="env-back" aria-hidden="true">
          <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="envInside" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e9b3c8" />
                <stop offset="100%" stopColor="#f6cfde" />
              </linearGradient>
            </defs>
            {/* papír obálky */}
            <rect x="1" y="1" width="298" height="198" rx="6"
              fill="#fff7fa" stroke="#f3b9cd" strokeWidth="2" />
            {/* tmavší vnitřek – vidět štěrbinou po otevření klopy */}
            <rect x="4" y="3" width="292" height="95" rx="5" fill="url(#envInside)" />
          </svg>
        </div>

        {/* 2) Dopis – mezi zadní stěnou a přední kapsou,
               takže opravdu vyjíždí ze štěrbiny obálky */}
        <div className={`env-letter${letterOpen ? ' open' : ''}`}>
          <span className="env-letter-icon">💗</span>
          <div className="env-letter-lines" aria-hidden="true">
            <div /><div /><div />
          </div>
        </div>

        {/* 3) Přední kapsa – boční a spodní sklady (před dopisem) */}
        <div className="env-front" aria-hidden="true">
          <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
            {/* boční sklady */}
            <polygon points="1,55 1,199 150,115" fill="#ffd9e6" />
            <polygon points="299,55 299,199 150,115" fill="#ffd9e6" />
            {/* spodní sklad */}
            <polygon points="1,199 150,113 299,199" fill="#ffe4ee" />
            {/* linky skladů pro plastičnost */}
            <path d="M1,199 L150,113 L299,199" fill="none"
              stroke="#f3b9cd" strokeWidth="1.5" strokeLinejoin="round" />
            {/* obrys, ať kapsa lícuje s tělem */}
            <rect x="1" y="1" width="298" height="198" rx="6"
              fill="none" stroke="#f3b9cd" strokeWidth="2" />
          </svg>
        </div>

        {/* 4) Klopa – pant přesně na horní hraně obálky,
               líc + rub řeší ::before/::after v CSS */}
        <div className={`env-flap${flapOpen ? ' open' : ''}`} aria-hidden="true" />

        {/* 5) Pečeť – pulz na vnitřním prvku, mizení na vnějším */}
        <div className={`env-seal${sealHidden ? ' hide' : ''}`} aria-hidden="true">
          <span className="env-seal-inner">💌</span>
        </div>
      </div>

      <p className={`envelope-hint${opened ? ' faded' : ''}`}>Klikni pro otevření</p>
    </div>
  )
}