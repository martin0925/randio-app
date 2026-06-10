import { useState } from 'react'
import './EnvelopeView.css'

/*
  Varianta „jedno SVG":
  ─ Celá scéna (zadní stěna, dopis, kapsa, pečeť) žije v jediném
    <svg viewBox="0 0 300 360"> → jeden souřadný systém, responzivita
    zdarma (žádné media queries s přepočty px).
  ─ Pořadí vykreslení = pořadí v dokumentu → žádné z-indexy.
  ─ Dopis je ořezán skutečným <clipPath>: viditelný jen NAD obálkou
    a uvnitř jejího interiéru. Vyjíždění ze štěrbiny je tak fyzikálně
    správné, ne trik s vrstvami.
  ─ Jediný HTML prvek je klopa — SVG neumí perspektivní 3D rotaci.
    Je pozicovaná v procentech scény, takže škáluje spolu s SVG.

  Geometrie (viewBox 300 × 360):
    y   0–160  prostor pro vyjetí dopisu
    y 160–360  obálka (horní hrana = pant klopy)
    dopis: x 24–276, y 186–334; .open → translateY(−162) → y 24–172
*/

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
        <svg
          className="env-svg"
          viewBox="0 0 300 360"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="envInside" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e9b3c8" />
              <stop offset="100%" stopColor="#f6cfde" />
            </linearGradient>
            <linearGradient id="letterPaper" x1="0" y1="0" x2="0.2" y2="1">
              <stop offset="0%" stopColor="#fffdfe" />
              <stop offset="100%" stopColor="#fff4f8" />
            </linearGradient>
            {/* Dopis smí být vidět jen NAD obálkou a uvnitř ní.
                Dva obdélníky v clipPath tvoří sjednocení oblastí. */}
            <clipPath id="letterClip">
              <rect x="0" y="0" width="300" height="166" />
              <rect x="6" y="162" width="288" height="194" />
            </clipPath>
            {/* měkký stín obálky bez CSS filtru (nerepaintuje se při animaci) */}
            <filter id="envShadow" x="-20%" y="-10%" width="140%" height="130%">
              <feDropShadow dx="0" dy="10" stdDeviation="13"
                floodColor="#c2185b" floodOpacity="0.22" />
            </filter>
          </defs>

          {/* 1) Zadní stěna + vnitřek (vidět štěrbinou po otevření klopy) */}
          <g filter="url(#envShadow)">
            <rect x="1" y="161" width="298" height="198" rx="6"
              fill="#fff7fa" stroke="#f3b9cd" strokeWidth="2" />
          </g>
          <rect x="4" y="163" width="292" height="95" rx="5" fill="url(#envInside)" />

          {/* 1b) Překlopená klopa — statická SVG kopie ZA dopisem.
                 Zviditelní se v okamžiku, kdy HTML klopa dokončí rotaci
                 a zprůhlední → plynulé předání, dopis pak jede před ní. */}
          <g className={`env-flap-flipped${flapOpen ? ' show' : ''}`}>
            <polygon points="1,161 299,161 150,45"
              fill="#ffe7f0" stroke="#f3b9cd" strokeWidth="1.5"
              strokeLinejoin="round" />
          </g>

          {/* 2) Dopis — ořezaný clipPathem, vyjíždí štěrbinou */}
          <g clipPath="url(#letterClip)">
            <g className={`env-letter${letterOpen ? ' open' : ''}`}>
              <rect x="24" y="186" width="252" height="148" rx="6"
                fill="url(#letterPaper)" stroke="#ffd3e3" strokeWidth="1" />
              <text x="150" y="254" textAnchor="middle" fontSize="32">💗</text>
              <rect x="67"  y="272" width="166" height="2.5" rx="1.25" fill="#ffd3e3" />
              <rect x="103" y="281" width="130" height="2.5" rx="1.25" fill="#ffd3e3" />
              <rect x="67"  y="290" width="91"  height="2.5" rx="1.25" fill="#ffd3e3" />
            </g>
          </g>

          {/* 3) Přední kapsa — boční sklady jdou až do horních rohů,
                 takže vedle zavřené klopy není vidět bílý dopis */}
          <g>
            <polygon points="1,161 1,359 150,275" fill="#ffd9e6" />
            <polygon points="299,161 299,359 150,275" fill="#ffd9e6" />
            <polygon points="1,359 150,273 299,359" fill="#ffe4ee" />
            <path d="M1,359 L150,273 L299,359" fill="none"
              stroke="#f3b9cd" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="1" y="161" width="298" height="198" rx="6"
              fill="none" stroke="#f3b9cd" strokeWidth="2" />
          </g>

        </svg>

        {/* 4) Klopa — jediný HTML overlay (SVG neumí perspektivní rotaci).
               Pozicovaná v % scény s 1px překryvem, ať lícuje s hranami. */}
        <div className={`env-flap${flapOpen ? ' open' : ''}`} aria-hidden="true" />

        {/* 5) Pečeť — HTML emoji (spolehlivé vykreslení napříč platformami).
               Pulz na vnitřním spanu, mizení na vnějším divu. */}
        <div className={`env-seal${sealHidden ? ' hide' : ''}`} aria-hidden="true">
          <span className="env-seal-inner">💌</span>
        </div>
      </div>

      <p className={`envelope-hint${opened ? ' faded' : ''}`}>Klikni pro otevření</p>
    </div>
  )
}