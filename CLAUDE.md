# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

React 18 + Vite date invitation app. The sender creates an invite and shares a link; the recipient opens an animated envelope, reads the letter, and confirms or counter-proposes. All state is in Firebase Firestore (real-time `onSnapshot`).

Deployed on GitHub Pages: `https://martin0925.github.io/randio-app/`

## Commands

```bash
npm run dev      # local dev server (http://localhost:5173/randio-app/)
npm run build    # production build → dist/
npm run preview  # preview built output
```

## Deploy

Push to `master` — GitHub Actions (`.github/workflows/deploy.yml`) builds with Vite and deploys `dist/` to GitHub Pages automatically. The Pages source must be set to "GitHub Actions" in the repo settings (not "Deploy from a branch").

## Architecture

```
src/
  App.jsx             — reads ?id= from URL, renders Planner or InviteView
  App.css             — all global + shared component styles
  firebase.js         — Firebase init, exports db
  constants.js        — ACTIVITIES, TIMES, DAYS, MONTHS, MONTHS_GEN
  utils.js            — fmtDate, fmtD, parseDate, baseUrl, mapsUrl,
                        countdownText, downloadIcs, findAct
  components/
    Planner.jsx       — create/counter-propose; props: editDoc, prefill, onEditDone
    InviteView.jsx    — live onSnapshot view; handles envelope→letter→editing flow
    EnvelopeView.jsx  — animated envelope (SVG body + clip-path flap)
    EnvelopeView.css  — envelope-specific styles
    LetterCard.jsx    — invite letter card with confirm/edit actions
    ShareButtons.jsx  — WhatsApp/Telegram/Facebook/X + copy button
    FloatingHearts.jsx — fixed background decoration
public/
  og.svg              — static Open Graph preview image
```

**URL routing** — client-side only via `?id=`:
- No `?id=` → Planner mode (create invite)
- `?id=<docId>` → InviteView mode (view/confirm/counter-propose)

**Firestore document schema** (`rande/{id}`):
```
datum          string   "YYYY-MM-DD"  — confirmed/primary date
datumOptions   string[] ["YYYY-MM-DD", ...]  — 1–3 selectable dates
cas            string   "HH:MM"
aktivita       string   activity id or custom text
od             string   sender name (optional)
komu           string   recipient name (optional)
misto          string   location (optional)
zprava         string   personal message (optional)
stav           string   "navrh" | "protinavrh" | "potvrzeno"
vytvoreno      timestamp
potvrzeno_kdy  timestamp
upraveno_kdy   timestamp
```

**Creator detection** — `localStorage.setItem('creator_${docId}', '1')` on invite creation. Creators skip the envelope animation and see live status directly.

**Counter-proposal flow** — clicking edit in `InviteView` sets `editing=true`, rendering `<Planner editDoc={...} prefill={plan} onEditDone={...} />` inline. On submit, Planner writes `stav:'protinavrh'` to the same doc and calls `onEditDone()` after 1.2 s. No page reload; `onSnapshot` already has updated data.

## Key design decisions

- **Vite base path** — `base: '/randio-app/'` in `vite.config.js` matches the GitHub Pages subpath. All asset URLs and the share URL (`baseUrl()` = `origin + pathname`) are relative to this.
- **Envelope CSS** — SVG for the body/folds; `clip-path: polygon(0% 0%, 100% 0%, 50% 100%)` for the triangular flap; explicit `height: 200px` (not `aspect-ratio`) for iOS <15 compatibility. Flap flip uses `perspective(600px) rotateX(-180deg)`.
- **No React Router** — only two "pages", distinguished by `?id=`. `window.location.href = baseUrl()` navigates to the planner.
- **No notifications** — removed; were too intrusive.
