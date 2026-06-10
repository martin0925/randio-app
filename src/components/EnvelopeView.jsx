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
    setTimeout(() => setFlapOpen(true), 150)   // flap opens: 0.65s → done at ~800ms
    setTimeout(() => setLetterOpen(true), 950) // letter rises after flap fully open
    setTimeout(() => onOpen(), 1750)           // transition done
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') handleOpen()
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
        {/* SVG envelope body + folds — drop-shadow only on this element */}
        <div className="env-shell">
          <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="1" y="1" width="298" height="198" rx="6"
              fill="#fff7fa" stroke="#ffc3d8" strokeWidth="2"/>
            <polygon points="0,200 150,115 300,200" fill="#ffe1ec"/>
            <polygon points="0,55 0,200 150,115" fill="#ffd3e3" opacity=".85"/>
            <polygon points="300,55 300,200 150,115" fill="#ffd3e3" opacity=".85"/>
          </svg>
        </div>

        {/* Letter — starts inside the envelope, rises through the opening */}
        <div className={`env-letter${letterOpen ? ' open' : ''}`}>
          <span className="env-letter-icon">💗</span>
          <div className="env-letter-lines" aria-hidden="true">
            <div/><div/><div/>
          </div>
        </div>

        {/* Flap — triangular, 3D-folds backward when opened */}
        <div className={`env-flap${flapOpen ? ' open' : ''}`}/>

        {/* Wax seal */}
        <div className={`env-seal${sealHidden ? ' hide' : ''}`}>💌</div>
      </div>

      <p className={`envelope-hint${opened ? ' faded' : ''}`}>Klikni pro otevření</p>
    </div>
  )
}
