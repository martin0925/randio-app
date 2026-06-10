# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Single-file static web app (`index.html`) — a romantic date invitation system. The sender creates an invite, shares a link; the recipient opens an animated envelope, reads the letter, and confirms or counter-proposes. Everything is real-time via Firebase Firestore.

Deployed on GitHub Pages: `https://martin0925.github.io/randio-app/`

## Deploy

```
git add index.html
git commit -m "..."
git push
```

GitHub Pages serves the `master` branch root. Changes are live within ~2 minutes.

## Architecture

All code lives in `index.html` — no build step, no bundler, no npm.

Firebase SDK is loaded via CDN (`https://www.gstatic.com/firebasejs/10.12.2/...`) using ES module imports inside a `<script type="module">`.

**URL routing** — entirely client-side via `?id=`:
- No `?id=` → planner mode (create invite)
- `?id=<docId>` → invite mode (view/confirm invite)

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

**Creator detection** — `localStorage.setItem("creator_${docId}", "1")` is set when a new invite is created. On the invite URL, creators skip the envelope animation and go directly to the live-status view.

**Multi-date flow** — when `datumOptions.length > 1` and `stav !== "potvrzeno"`, the invite shows date-picker chips. The recipient's chosen date is written back as `datum` on confirm.

## Firestore security rules

The rules must be kept in sync with the document schema. Current required fields for `create`:
```
['datum', 'cas', 'aktivita', 'stav', 'vytvoreno']
```
`update` allows any fields as long as `stav` is `"protinavrh"` or `"potvrzeno"`.

## Key design decisions

- **No backend** — all logic runs client-side; Firestore is the only persistence layer.
- **Envelope animation** — SVG body + `clip-path` flap (not CSS border tricks, which had zero-height issues on mobile). The flap uses `transform-style: preserve-3d` + `perspective` for the 3-D flip.
- **Counter-proposal** — reuses the same Firestore document and URL; no new doc is created. After submitting, the planner hides and `inviteView` is shown directly (no `location.reload()`).
- **`og.svg`** — static Open Graph preview image committed alongside `index.html`.
