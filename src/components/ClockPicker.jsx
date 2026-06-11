import { useState } from 'react'

const CX = 120, CY = 120
const R_OUTER = 88
const R_INNER = 56

const OUTER_H = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const INNER_H = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
const MIN_OPTS = [0, 15, 30, 45]
const MIN_IDX  = { 0: 0, 15: 3, 30: 6, 45: 9 }

function polar(idx, r) {
  const a = (idx / 12) * 2 * Math.PI - Math.PI / 2
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r }
}

export default function ClockPicker({ value, onChange }) {
  const [mode, setMode] = useState('hour')

  const hour   = value ? parseInt(value.split(':')[0]) : null
  const minute = value ? parseInt(value.split(':')[1]) : null

  function pickHour(h) {
    const m = minute ?? 0
    onChange(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    setMode('minute')
  }

  function pickMinute(m) {
    const h = hour ?? 12
    onChange(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    setMode('hour')
  }

  function handEnd() {
    if (mode === 'hour' && hour !== null) {
      const inner = hour === 0 || hour >= 13
      const r   = inner ? R_INNER : R_OUTER
      const idx = inner ? INNER_H.indexOf(hour) : OUTER_H.indexOf(hour)
      return { ...polar(idx, r), r }
    }
    if (mode === 'minute' && minute !== null) {
      const idx = MIN_IDX[minute]
      if (idx == null) return null
      return { ...polar(idx, R_OUTER), r: R_OUTER }
    }
    return null
  }

  const hand = handEnd()

  return (
    <div className="clock-picker">
      {/* Digital display */}
      <div className="clock-display">
        <button className={`clock-dp${mode === 'hour' ? ' active' : ''}`} onClick={() => setMode('hour')}>
          {hour !== null ? String(hour).padStart(2,'0') : '--'}
        </button>
        <span className="clock-sep">:</span>
        <button className={`clock-dp${mode === 'minute' ? ' active' : ''}`} onClick={() => setMode('minute')}>
          {minute !== null ? String(minute).padStart(2,'0') : '--'}
        </button>
      </div>

      {/* Clock face */}
      <svg viewBox="0 0 240 240" className="clock-svg"
        style={{ fontFamily: 'Quicksand, sans-serif' }}>
        <circle cx={CX} cy={CY} r={112} className="clock-face" />

        {/* Hand */}
        {hand && <>
          <line x1={CX} y1={CY} x2={hand.x} y2={hand.y} className="clock-hand" />
          <circle cx={CX} cy={CY} r="5" className="clock-center-dot" />
          <circle cx={hand.x} cy={hand.y} r="18" className="clock-sel-ring" />
        </>}

        {/* Hour numbers — outer ring */}
        {mode === 'hour' && OUTER_H.map((h, i) => {
          const p = polar(i, R_OUTER)
          const sel = h === hour
          return (
            <g key={h} onClick={() => pickHour(h)} style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r="18" fill="rgba(0,0,0,0)" />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                fontSize="14" fontWeight={sel ? 700 : 500}
                fill={sel ? '#fff' : '#4a1e30'}
              >{h}</text>
            </g>
          )
        })}

        {/* Hour numbers — inner ring (13–24) */}
        {mode === 'hour' && INNER_H.map((h, i) => {
          const p = polar(i, R_INNER)
          const sel = h === hour
          return (
            <g key={h} onClick={() => pickHour(h)} style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r="15" fill="rgba(0,0,0,0)" />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                fontSize="11" fontWeight={sel ? 700 : 500}
                fill={sel ? '#fff' : '#c9a0b4'}
              >{h === 0 ? '0' : h}</text>
            </g>
          )
        })}

        {/* Minute numbers */}
        {mode === 'minute' && MIN_OPTS.map(m => {
          const p = polar(MIN_IDX[m], R_OUTER)
          const sel = m === minute
          return (
            <g key={m} onClick={() => pickMinute(m)} style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r="22" fill="rgba(0,0,0,0)" />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                fontSize="14" fontWeight={sel ? 700 : 500}
                fill={sel ? '#fff' : '#4a1e30'}
              >{String(m).padStart(2,'0')}</text>
            </g>
          )
        })}
      </svg>

      <p className="clock-hint">
        {mode === 'hour' ? 'Vyber hodinu' : 'Vyber minuty'}
      </p>
    </div>
  )
}
