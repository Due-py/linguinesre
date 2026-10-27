# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## State of the repo

Next.js 16.4 (App Router, Turbopack, `src/` dir, `@/*` alias) + React 19 + TypeScript + Tailwind v4. Done: Phase 0 (scaffold), Phase 1a (latency lab), content pilot (Grade 8 Unit 1 draft) and Phase 1b (intro page, class-code auth; not yet tested against a real Supabase project). The full approved plan (Vietnamese) is at `C:\Users\duynd\.claude\plans\init-read-everything-in-majestic-boot.md`; read it before starting any phase.

```bash
npm run dev                                       # http://localhost:3000
npm run lint                                      # eslint
npm run build                                     # production build + type check
npm test                                          # vitest run (all unit tests)
npx vitest run src/lib/latency/measure.test.ts    # one test file
npx vitest run -t "classifyTrial"                 # tests matching a name
```

Tests cover pure logic only (`src/**/*.test.ts`, node environment). Browser audio code is verified by driving the page in headless Chrome with `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav>`. When starting `next start` in the background for such checks, stop it afterwards by the PID listening on its port; stopping only the shell leaves the server running.

### Latency lab (`/lab/latency`, Phase 1a)

`src/lib/latency/`: `onset.ts` (pure threshold/onset/silence trackers), `measure.ts` (classify trial, summary, CSV; `MIN_PLAUSIBLE_LATENCY_MS` = 150, faster onsets count as "early"), `voice-detector.ts` (browser: mic RMS meter, audio-clock prompt playback, Web Speech mode B), `questions.ts`. Latency is measured from the audio-clock end of the prompt, so prompt audio must have no trailing silence: `scripts/make-lab-audio.ps1` generates WAVs with the Windows voice and trims them with ffmpeg (run with `powershell -NoProfile -File scripts\make-lab-audio.ps1`). Spike procedure and results: `docs/latency-spike/`; write `RESULTS.md` there only from real device data.

### Content (`src/content/`)

`schema.ts` (zod) is the one shape for all 78 Units; `units/index.ts` registers each `units/g<grade>/u<nn>-<slug>.json` and parses it at import, so invalid content fails the build. Build-time rules: Speed Q&A / roleplay sample answers must satisfy their `keywords` (`match.ts`: groups of alternatives, all groups required, `*` wildcard inside a word), abbreviations (2+ capitals) need a `say` text for TTS, ids unique, pages inside the Unit range. `collectSpeakables()` is the list the future Kokoro script will voice. Unit text is rewritten from the SGK, never copied; sources per Unit go in `docs/content/<unit>-nguon.md`. Review pages: `/lab/content/[unitId]`. Only `teacher-approved` Units open to students.

### Auth (Phase 1b)

Class code + nickname + 6-digit PIN. Supabase Auth needs an email, so `hiddenEmail(classId, nicknameKey)` (sha256, `@students.example.com`) is used internally; no mail is ever sent. Accounts are created only by the `register` server action with the secret-key admin client after the class code is checked; public sign-up must stay disabled in Supabase. `src/lib/auth/identity.ts` holds the pure rules (tested); `src/app/(auth)/actions.ts` the register/login/logout actions; wrong PIN 5x locks 15 min (`login_attempts`, server-only). `src/proxy.ts` (Next 16 name for middleware) refreshes the session and redirects `/hoc` ↔ auth pages. Pages reading the session must sit inside `<Suspense>` (cacheComponents). Without env vars the app builds and shows a "not configured" notice. Env: see `.env.example`; DB schema + RLS: `supabase/migrations/`; setup steps: `docs/supabase-setup.md`. `src/lib/supabase/admin.ts` bypasses RLS — server only, after checking who is asking.

### Conventions

Next.js 16 differs from older versions (see `AGENTS.md`): read the matching guide in `node_modules/next/dist/docs/` before writing Next.js code. `next.config.ts` has `cacheComponents` and `partialPrefetching` on.

Design tokens live in `src/app/globals.css` (`:root` vars mapped to Tailwind via `@theme inline`): `background`, `surface`, `foreground`, `muted`, `line`, `accent` / `accent-ink` (the single green accent), and `level-0`…`level-3` pastel tiles. Font: Manrope (`latin` + `vietnamese` subsets) via `next/font/google` in `src/app/layout.tsx`. UI copy is Vietnamese (`<html lang="vi">`); English practice content goes in the Unit data.

`docs/vibe-coding-log.md` is the contest evidence log; add a row when a session ships something.

`files/` is git-ignored (copyrighted SGK, videos); keep it that way.

Do not read or reuse anything outside this folder (e.g. the sibling `school stuffs/linguareflex` folder) unless the user asks.

## What the project is

LINGUA-REFLEX: a web app that trains Vietnamese students to speak English with fast reflexes, using content from the Global Success textbooks (grades 6-12). Entry in FPT STEMPETITION 2027, Challenge 3 Smart Education, tiểu ban Công nghệ kỹ thuật, bảng THCS. Team "The Linguines" (lớp 8A1, FPT Bắc Giang); teacher: cô Nguyễn Thị Vân.

Deadlines: report + prototype **15/11/2026**; demo 16/11-15/12; school final 26/12/2026; semi-final 01/2027; national final 03/2027.

Scoring (100) includes 10 points for **Vibe Coding evidence**: prompt history, screen recordings, and proof the team understands, checks and edits AI-written code. Keep prompt history, never fabricate logs or results, and report only numbers actually measured.

## Source files (`files/`)

- `LINGUA-REFLEX – Đề cương ý tưởng.pdf`: the idea; defines the mechanisms below.
- `PHÁT ĐỘNG CUỘC THI STEMPETITION_2027.docx`: rules and scoring.
- `SGK/*.pdf`: Global Success grades 6-12. They are **scanned images with no text layer** (`pdftotext` returns nothing useful), so read them by rendering pages to images (poppler `pdftoppm` is on PATH). Grade 8 Unit 1 "Leisure Time" is pp. 8-17.
- `Design Inspiration 1-4`: reference videos (HopeRise, ZeBeyond, Vertex, mirko romanelli). Extract frames with `ffmpeg` (installed). Take-away: cream/white background, large rounded cards, heavy headings, one green accent, big stat numbers, pastel tiles to tell levels apart, light motion.
- SGK PDFs are copyrighted (NXB Giáo dục VN / Pearson): never commit them or serve them on the web.

## Product architecture (approved)

Flow: intro page → register/login with class code → first-login Test (mic check + 5-6 short spoken questions, stored as the "before" baseline) → pick grade/Unit → 4 levels (L0 vocab + pronunciation, L1 sentence frames, L2 extended sentences, L3 ~30 s paragraph) → Speed Q&A (5 s → 3 s → 1.5 s) → Micro-Roleplay → Digital Skill Profile. Teacher Dashboard is V2.

Core mechanisms: Pyramid Scaffolding (L0-L3), Adaptive Rescue Cascade (image → English subtitle/sentence starter → simpler question → Vietnamese keyword last; the student must always still produce the answer), Speed Q&A, Micro-Roleplay.

Chosen stack: Next.js + TypeScript + Tailwind, Supabase (Singapore region) for auth/DB, Vercel hosting, GitHub, OpenAI for runtime features only. Speech recognition: try browser Web Speech API first, fall back to OpenAI Whisper if it fails on iPhone/Safari (decide after the latency spike). Reference audio: pre-generated files, not live TTS.

Rules that need several files to honour:

- **Response latency** = from the moment the question audio ends to the first detected voice, auto-detected (no mic-button click). Typed answers are never mixed in.
- **Speed Q&A never waits for the AI.** Instant local check (keywords/patterns); OpenAI feedback comes afterwards.
- **Auth**: class code + nickname + 6-digit PIN via Supabase Auth, no email, no real names. Class codes are created by hand in the DB for V1. Teacher role is assigned only in the DB, never self-selectable. Rate-limit PIN attempts. Row-level security: a student sees only their own rows.
- **Privacy**: minors. Do not store audio; store only recognised text, timings, levels, hint level used.
- **AI calls** go through server routes only, with auth, per-user rate limits and a spend cap. Keys live only in Vercel env / `.env.local`; never in client code, git or chat. OpenAI budget ceiling is the user's prepaid amount; confirm the cap before spending. Check current model names/prices from official docs at build time.
- **Roleplay AI** is locked to the Unit's vocabulary/patterns, short turns, no personal-info questions, redirects off-topic talk. Keep a scripted (non-AI) Roleplay as a fallback; if the AI version is not stable by 10/11, ship the scripted one.
- **Content is data, not code**: each Unit is a data file with one shared schema (vocab, L1/L2/L3 prompts, Speed Q&A items, roleplay scenarios, rescue hints, audio refs) so adding a Unit needs no code change. Units not yet written show as "coming soon".

## Content pipeline

Claude reads the SGK page images itself and drafts the Unit data; the user/teacher reviews it. Do **not** use OpenAI to ingest SGK PDFs. Order: grade 8 Unit 1 first (fixes the schema), then all 78 Units (grades 6-9: 12 each, 10-12: 10 each) in small batches, suggested order 8 → 7 → 9 → 6 → 10 → 11 → 12.

## Working agreements with the user

The user is a lớp 8 student, not an IT person, and writes Vietnamese. Answer in Vietnamese, explain jargon briefly, list the files you will create and wait for approval before large changes, and do not start a new phase until told. Phases and the 10/11 fuse are in the plan file.
