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
    setTimeout(() => setFlapOpen(true), 160)
    setTimeout(() => setLetterOpen(true), 760)
    setTimeout(() => onOpen(), 1550)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') handleOpen()
  }

  return (
    <div id="envelopeView">
      <h1 className="title" style={{ marginBottom: '8px' }}>Máš poštu 💌</h1>
      <p className="sub">Někdo ti poslal pozvánku na rande</p>
      <div
        className="env-wrap"
        role="button"
        aria-label="Otevřít pozvánku"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
      >
        <svg className="env-bg" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="1" y="1" width="298" height="198" rx="5" fill="#fff7fa" stroke="#ffc3d8" strokeWidth="2" />
          <polygon points="0,200 150,115 300,200" fill="#ffe1ec" />
          <polygon points="0,55 0,200 150,115" fill="#ffd3e3" opacity=".85" />
          <polygon points="300,55 300,200 150,115" fill="#ffd3e3" opacity=".85" />
        </svg>
        <div className={`env-letter${letterOpen ? ' open' : ''}`}>💗</div>
        <div className={`env-flap${flapOpen ? ' open' : ''}`}></div>
        <div className={`env-seal${sealHidden ? ' hide' : ''}`}>💌</div>
      </div>
      <p className="envelope-hint">Klikni pro otevření</p>
    </div>
  )
}
