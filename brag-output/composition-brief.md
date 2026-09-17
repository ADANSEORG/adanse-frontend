# Hyperframes Composition Brief: Adanse

## Objective
Create a premium, cinematic, Apple-keynote-style launch film for Adanse — a thesis analysis product that takes students from raw research data to a Word-ready thesis Chapter 4.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 30 seconds (explicit user ceiling with a fixed 0–4 / 4–8 / 8–18 / 18–24 / 24–30 beat map — this overrides the skill's default 15-25s guidance by direct user request)

## Source Material
- Project root: `C:\Users\User\Desktop\CODING\ANALYSIS-TOOL-PROJECT\ADANSE\frontend`
- Primary files read: `index.html`, `README.md`, `package.json`, `src/styles.css`, `src/App.jsx`, `src/hooks/useThesisWorkflow.js`, `src/components/UploadZone.jsx`, `src/components/ColumnPreview.jsx`, `src/components/DatasetReview.jsx`, `src/components/ThesisWorkspace.jsx` (quant/qual result cards), `src/components/ThesisSetup.jsx`, `src/components/WelcomeModal.jsx`
- Product name: Adanse
- Tagline / strongest claim: page title "Adanse — Thesis Analysis"; product flow (README): "Research context → Dataset → Analysis plan → Results → Chapter 4"; the app "asks for the research context first, maps objectives to real dataset variables, chooses supported methods, explains why, and then produces a grounded Word chapter."
- Key UI or visual moment to recreate: the cream-and-gold card system — the dataset upload dropzone, the Numeric/Categorical column classification, the cleaning report resolving to a "Validated" status badge, the quantitative stat grid (N/Mean/SD/Median or r=/p-value), the qualitative theme card with a real excerpt quote, and the Chapter 4 document view.
- Copy that must appear verbatim:
  - "Your thesis data has answers."
  - "Finding them shouldn't take weeks."
  - "Complex research data."
  - "Understood clearly."
  - "Your research. Understood."
  - "Adanse" (wordmark)

## Creative Direction
- Tone preset: `polished`
- Creative direction: Apple-inspired premium tech launch film — cinematic black opens into the product's own warm cream/gold world; macro UI camera moves; soft reflections; restrained transitions; no flashy effects, no stock footage, no generic AI imagery.
- Interpretation: Restraint carries the film. The hook and outro are slow, typographic, and quiet. The middle UI sequence is allowed to move faster than typical `polished` pacing per the user's explicit "rapidly showcase" direction, but it should read as one continuous macro camera move gliding across the product (drifts and soft holds), not a series of hard cuts — six states resolve in sequence, each still getting its reading floor.
- Angle: Research data is valuable, but the distance between "I have a dataset" and "I have a defensible Chapter 4" is where students lose weeks. Adanse closes that distance, and the film should look as effortless and expensive as the result feels.
- Hook: completely dark frame, subtle low sound cue, two minimal lines in sequence — no logo, no UI yet.
- Outro / punchline: hard cut to a hero frame — the Adanse wordmark, full scale, soft light — with "Your research. Understood." Long hold, fade to black. No CTA, no URL.
- Avoid:
  - Generic SaaS language ("streamline your workflow" etc.)
  - Abstract filler visuals, stock footage, generic AI imagery
  - Cheesy startup animation, flashy/overproduced effects
  - Any redesign of the actual product UI — recreate it faithfully in the palette/fonts below

## Visual Identity
- Background (cinematic open/close only, not from the app): near-black, e.g. `#0a0906`
- Background (product world): `#faf5e9` (`--bg`)
- Surface: `#fffdf8` (`--surface`)
- Text (primary): `#211b16` (`--ink`)
- Text (muted): `#74695e` (`--muted`)
- Line/border: `#e4d8c3` (`--line`)
- Accent/brand: `#dda622` (`--gold`), soft `#f5e7bf` (`--gold-soft`)
- Positive/validated accent: `#245b42` (`--green`), soft `#e9f0eb` (`--green-soft`)
- Shadow: `0 18px 55px rgba(58, 43, 20, 0.07)` (soft, warm, low-contrast — matches the "soft reflections" direction)
- Display font: Space Grotesk (500/600/700) — Google Fonts
- Body font: DM Sans (400/500/600/700) — Google Fonts
- Visual references from the project: the warm cream-and-gold card system with soft shadows; gold status accents; green "Validated" badge; theme cards with quoted excerpts; the stat grid used for distribution/statistical results; the `.logo` wordmark treatment (Space Grotesk 700, tight letter-spacing, -0.04em).

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract. Full scene-by-scene detail, sequential/interaction notes, and per-scene audio intent are there — this is the summary:

1. **The problem** — 4s — dark frame, two short lines in sequence ("Your thesis data has answers." → "Finding them shouldn't take weeks."), no product visuals.
2. **The reveal** — 4s — Adanse wordmark resolves out of darkness with a soft light bloom; tagline "Thesis Analysis" follows; background begins bleeding from near-black toward the product's cream world.
3. **The product, in motion** — 10s — one continuous macro camera move across the real interface, pausing at six states in order: dataset drop → columns classified Numeric/Categorical → cleaning report resolves to "Validated" → distribution stat grid fills in → quant result (r=/p-value) beside a qualitative theme card with a real excerpt → Chapter 4 document forms.
4. **The message** — 6s — calm premium background, two short lines in sequence ("Complex research data." → "Understood clearly."), a faint blurred Chapter 4 fragment behind as texture.
5. **The hero close** — 6s — hard cut to a hero frame, Adanse wordmark centered full scale, "Your research. Understood." resolves beneath it, long hold, fade to black.

## Audio
- Audio role: cinematic support with a low swell and restrained motion-matched accents (minimal but present, per `polished` tone)
- Audio arc: near-silent under the dark hook → gentle rise into the logo reveal → holds low and steady under the six-state UI sequence → swells again through the message beat → soft resolve and fade under the final hero hold
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` ("Steady and clean" — bundled pick for `polished`/`cinematic`)
- Music treatment: start near-silent (~0.05-0.1 volume) under Scene 1, rise to ~0.25-0.3 through Scenes 2-3, hold steady through Scene 3, swell to ~0.3-0.35 through Scene 4, fade to 0 by the end of Scene 5's hold. Never exceed ~0.35 — this is a quiet film.
- Music cue guidance: bundled preset at `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (see matching `.md` for a human-readable summary). Target 3 strong-cue locks: the logo reveal (~4s into the video, Scene 2 start), the first UI state landing (~8-9s, Scene 3 start), and the final tagline landing (~26-27s, Scene 5). Use `strongCues` within ±0.15s for these; ignore any cue that would hurt readability or the beat map above.
- Audio-reactive treatment: subtle — the gold accent/glow on the "Validated" badge and the hero wordmark's soft light may breathe very slightly with the music's low end (RMS). No waveform/equalizer visuals, no strobing.
- Audio-coupled moments:
  - Scene 1 — soft low tone under line one's fade-in; near-silence under line two.
  - Scene 2 — one soft dry/bell hit exactly as the wordmark resolves into focus (beat-locked to the nearest strong cue within ±0.15s if one falls near 4s).
  - Scene 3 — six very quiet arrival ticks, one per UI state; a marginally warmer tick on the "Validated" badge resolving; keep this restrained, not rhythmic.
  - Scene 4 — no ticks, let the two lines breathe under the music swell alone.
  - Scene 5 — one soft, warm resolve tone as the tagline settles; music fades under the final hold.
- SFX selection guidance: minimal but present, per the `polished` energy tier — 2-3 primary cues total is the target, plus the six very quiet Scene 3 arrival ticks (choose a single consistent quiet family for those six, e.g. `interface/drop_001`-style softness, so they read as one coherent sequence rather than six different sounds). For the two "big" moments (logo reveal, final tagline), prefer `impact/impactBell_heavy_*` or `interface/bong_001` at low volume. Nothing aggressive, no glitch/error families.
- SFX analysis guidance: read `sfx-analysis.md`/`.json` beside the SFX library (`skills/brag/assets/sfx/` in the installed plugin cache) and prefer low/medium high-frequency-risk files for these polished, repeated moments.
- Exact SFX choice: Hyperframes should choose exact filenames, timestamps, density, and volume based on the implemented animation timing.
- Audio files: music and cue files are already copied into `brag-output/composition/assets/music/`. Copy any SFX Hyperframes selects into `brag-output/composition/assets/sfx/` (directory already created).

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). `/brag` is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo/launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (Scene 3 is the centerpiece; it must recreate real Adanse UI, not generic mockups).
- Keep all text readable in the final render — respect the reading-floor guidance in `brag-plan.md` even where the UI sequence moves quickly.
- Keep the total video at 30 seconds, matching the five-scene beat map in `brag-plan.md` (4/4/10/6/6).
- Include the planned music/SFX layer (not disabled, not silent).
- Treat the `/brag` audio notes above as guidance, not a fixed cue sheet — choose exact SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints; ignore cues that hurt readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within about ±0.15s. Smaller entrances may align to nearby beat points within about ±0.10s. Use only the 3 strong-cue locks noted above unless the edit clearly benefits from a 4th.
- Use SFX to support motion and interaction: soft drop/place sounds for the dataset landing in the dropzone, quiet ticks for the six sequential UI states, one restrained bell/announcement cue for the logo reveal and one for the final tagline.
- Honor the music treatment above (near-silent open, gentle rise, steady hold, swell, fade).
- Wire in the Hyperframes audio-reactive workflow for the subtle glow/breathe treatment noted above; if extraction is unavailable (no helper or ffmpeg), skip it and note the limitation rather than blocking the render.
- Use local assets for audio and any required runtime/media dependencies.
- Run `hyperframes check` before render — it is brag's single gate.
