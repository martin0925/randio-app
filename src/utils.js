import { ACTIVITIES, DAYS, MONTHS_GEN } from './constants'

export function countdownCompact(datumStr) {
  const date = parseDate(datumStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date - today) / 86400000)
  if (diff < 0) return null
  if (diff === 0) return 'Dnes 🎉'
  if (diff === 1) return 'Zítra 💗'
  if (diff <= 4) return `za ${diff} dny`
  return `za ${diff} dní`
}

export const pad = (n) => (n < 10 ? '0' + n : '' + n)

export const parseDate = (s) => {
  const p = s.split('-').map(Number)
  return new Date(p[0], p[1] - 1, p[2])
}

export const fmtD = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fmtDate = (d) =>
  `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`

export const findAct = (id) => ACTIVITIES.find((a) => a.id === id) || null

export const baseUrl = () => window.location.origin + window.location.pathname

export const mapsUrl = (place) =>
  `https://maps.google.com/?q=${encodeURIComponent(place)}`

export function countdownText(datumStr) {
  const date = parseDate(datumStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date - today) / 86400000)
  if (diff < 0) return null
  if (diff === 0) return 'Rande je dnes! 🎉'
  if (diff === 1) return 'Rande je zítra! 💗'
  const unit = diff < 5 ? 'dny' : 'dní'
  return `⏳ Rande za ${diff} ${unit}`
}

export function downloadIcs(plan) {
  const dp = plan.datum.split('-').map(Number)
  const t = plan.cas.split(':').map(Number)
  const start = `${dp[0]}${pad(dp[1])}${pad(dp[2])}T${pad(t[0])}${pad(t[1])}00`
  const end = `${dp[0]}${pad(dp[1])}${pad(dp[2])}T${pad((t[0] + 2) % 24)}${pad(t[1])}00`
  const label = (findAct(plan.aktivita)?.label || plan.aktivita).replace(/,/g, '\\,')
  const loc = plan.misto ? `\r\nLOCATION:${plan.misto.replace(/,/g, '\\,')}` : ''
  const desc = plan.zprava
    ? `\r\nDESCRIPTION:${plan.zprava.replace(/,/g, '\\,').replace(/\n/g, '\\n')}`
    : ''
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//rande//CZ',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@rande`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Rande 💗 ${label}${loc}${desc}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.href = url
  a.download = 'rande.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function openInCalendar(plan) {
  const dp = plan.datum.split('-').map(Number)
  const [h, m] = plan.cas.split(':').map(Number)
  const fmtDt = (y, mo, d, hh, mm) => `${y}${pad(mo)}${pad(d)}T${pad(hh)}${pad(mm)}00`
  const start = fmtDt(dp[0], dp[1], dp[2], h, m)
  const end = fmtDt(dp[0], dp[1], dp[2], (h + 2) % 24, m)
  const title = `Rande 💗 ${findAct(plan.aktivita)?.label || plan.aktivita}`
  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}`
  if (plan.misto) url += `&location=${encodeURIComponent(plan.misto)}`
  if (plan.zprava) url += `&details=${encodeURIComponent(plan.zprava)}`
  window.open(url, '_blank', 'noopener')
}
