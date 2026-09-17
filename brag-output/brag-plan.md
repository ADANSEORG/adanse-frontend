# Brag Plan: Adanse

## What is this app?
Adanse takes a student from raw research context and a messy dataset to a Word-ready thesis Chapter 4 — it classifies and cleans the data, runs the right statistical and qualitative analysis automatically, and explains its choices in plain language.

## The angle
This is not a joke video — it's a premium technology launch film, deliberately restrained and Apple-keynote-adjacent. The angle: research data is valuable but the distance between "I have a dataset" and "I have a defensible Chapter 4" is where most students drown. Adanse closes that distance. The film should feel expensive, quiet, and confident — the product doing serious work should look effortless.

## Hook (first 2-3 seconds)
Completely dark frame. A single subtle sound cue (soft low tone, not a whoosh). One minimal line fades in, then holds:
"Your thesis data has answers."
A beat of silence, then a second, shorter line replaces it:
"Finding them shouldn't take weeks."
No logo yet. No UI yet. Just typography and darkness.

## Key moments (the middle)
- The dropzone accepting a real dataset file (UploadZone) — the entry point, shown as an actual drag-drop moment, not an icon.
- Columns auto-labeled Numeric / Categorical with missing-value and outlier counts resolving to a "Validated" status (ColumnPreview + DatasetReview) — the product understanding the data on its own.
- A statistical result card locking in (mean/SD/median, or r = / p-value) next to a qualitative theme card with a real excerpt quote (QuantitativeResult + QualitativeResult) — quant and qual analysis shown side by side, the project's actual differentiator.
- The Chapter 4 document forming — styled like a real academic document, not a dashboard.

## Outro / punchline
Hard cut to black, then a single hero frame: the Adanse wordmark (Space Grotesk) centered in warm cream light, with the line:
"Your research. Understood."
Hold. Fade to black. No CTA, no URL — restraint is the close.

## User flow worth showing
Entry → key action → result, pulled straight from the product's own stated flow (README: "Research context → Dataset → Analysis plan → Results → Chapter 4"):
1. **Entry:** Drop a dataset file into Adanse.
2. **Key action:** Adanse classifies the variables, flags and cleans issues, then runs the matched statistical/qualitative tests.
3. **Result:** A validated, thesis-ready Chapter 4 with quant results and qualitative themes, ready to hand to an advisor.

## Tone
- Preset: `polished`
- Creative direction: "Apple-inspired premium tech launch film — cinematic darkness opening into the product's own warm cream/gold world, macro UI camera moves, soft reflections, restrained transitions, no flash."
- Interpretation: Restraint is the entire visual argument. Slow, confident holds; typography does the talking in the hook and outro; the middle section is allowed to move faster than typical `polished` pacing because the user explicitly asked for "rapid cinematic UI transitions," but every beat still gets its reading floor — treated as one continuous camera move across the product rather than six separate hard cuts, so it reads as fluid rather than choppy.

## Format: landscape — 1920x1080
## Duration: 30s (explicit user-specified ceiling and beat map; overrides the default 15-25s guidance by direct request — the user supplied an exact 0–4 / 4–8 / 8–18 / 18–24 / 24–30 timing structure)

## Visual identity (from the project)
- Background (dark open): near-black #0a0906 (original to this film, not in the app — used only for the cinematic hook/outro frame)
- Background (product world): #faf5e9 (--bg, warm cream)
- Surface: #fffdf8 (--surface)
- Accent/brand: #dda622 (--gold), soft variant #f5e7bf (--gold-soft)
- Positive/validated: #245b42 (--green), soft variant #e9f0eb (--green-soft)
- Primary text: #211b16 (--ink)
- Muted text: #74695e (--muted)
- Line/border: #e4d8c3 (--line)
- Display font: Space Grotesk (600-700)
- Body font: DM Sans (400-600)
- Strongest visual element: the warm cream-and-gold card system — soft-shadowed cards, gold status accents, theme cards with quoted excerpts, and the stat grid (N / Mean / SD / Median, r = / p-value) that make the analysis feel rigorous and real.

## Share copy (draft)
Adanse turns a messy dataset into a thesis-ready Chapter 4 — your research, understood.

## Audio direction
- Role: cinematic support with a low swell, restrained motion-matched accents
- Music: a slow-building, minimal/ambient cinematic bed — soft low pad at open, gentle swell rising into the product reveal, present but low under the UI sequence, swelling once more into the outro
- Music treatment: starts near-silent under the dark hook, subtle rise into the logo reveal (4-8s), holds steady and low under the UI sequence (8-18s), swells gently through the message beat (18-24s), soft resolve/fade under the final hero hold (24-30s)
- Music cue guidance: to be detected at composition time (no bundled track chosen yet); target 3 strong cues — the logo reveal at ~4s, the first UI state landing at ~8-9s, and the final tagline landing at ~26-27s
- Audio-reactive treatment: subtle — the gold accent/glow on validated states and the hero wordmark may breathe very slightly with the music's low end; never waveform-literal
- SFX posture: sparse, professional restraint — one soft tone on the opening frame, one soft dry hit on the logo reveal, quiet card/status-arrival ticks through the UI sequence, one final soft resolve on the tagline
- Audio-coupled moments: the two hook lines settling (soft tone under each), the six UI states landing in sequence (very quiet ticks, not a rhythm track), the "Validated" status resolving (a slightly warmer tick), the tagline's final hold
- Restraint rule: no whooshes, no risers that call attention to themselves, no percussive hits on every cut — silence and low presence do more work than density here

## Storyboard

### Scene 1 — The problem — 4s
Completely dark (near-black) frame. Subtle low sound cue on frame 1. Line one fades in and holds: "Your thesis data has answers." (settles ~1.5s, floor for a 5-word line). Quick soft crossfade to line two: "Finding them shouldn't take weeks." (settles ~1.3s). No product visuals yet — pure typography on black, generous negative space, small centered type.
Sequential/interaction: yes — two short lines replace each other in sequence, each held to its reading floor before the crossfade.
Audio intent: quiet, expectant, a little tense — the calm before the reveal.
Audio-coupled idea: soft low tone under line one's fade-in; near-silence under line two.
Music: near-silent low pad, barely present.
Transition mood: soft → Scene 2

### Scene 2 — The reveal — 4s
Hard cut from black into a dramatic, clean reveal of the Adanse wordmark (Space Grotesk, 700 weight, letter-spacing tightened per the app's own `.logo` style) — it resolves out of darkness with a soft light bloom, not a slide or bounce. Tagline "Thesis Analysis" (from the app's own `<title>`) fades in beneath at small size a beat later. Background begins a slow bleed from near-black toward the product's warm cream (#faf5e9), setting up Scene 3.
Sequential/interaction: none — a single deliberate reveal, not a sequence.
Audio intent: the swell arrives here — quiet confidence, not a bombastic sting.
Audio-coupled idea: one soft dry hit exactly as the wordmark resolves into focus.
Music: gentle rise begins.
Transition mood: soft crossfade → Scene 3

### Scene 3 — The product, in motion — 10s
One continuous macro camera move gliding across the real Adanse interface (cream/gold card system, soft shadow per `--shadow`), pausing at six states in order, each held ~1.5-1.8s with a small camera drift (not a hard cut) between them:
1. UploadZone — a dataset file drops into the dropzone; filename and row/column count resolve into the "current dataset" card.
2. ColumnPreview — variable badges resolve to "Numeric" / "Categorical" labels across a few columns.
3. DatasetReview — the cleaning report's actions settle, status badge shifts to "Validated" (green).
4. A distribution stat grid fills in: N, Mean, SD, Median.
5. Side by side: a quantitative result (r = / p-value) locks in next to a qualitative theme card with one real excerpt quote.
6. The Chapter 4 document forms on screen, styled like an actual academic page, not a dashboard.
Sequential/interaction: yes — six states resolve in order along one continuous camera move; each state gets a quiet arrival cue, not a hard visual reset.
Audio intent: steady, focused, quietly impressive — the sound of precision, not excitement.
Audio-coupled idea: a very quiet tick on each of the six arrivals; a marginally warmer tick when the "Validated" badge resolves.
Music: low and steady under this whole sequence, no swell yet.
Transition mood: soft → Scene 4

### Scene 4 — The message — 6s
Background settles into a calm, premium neutral (cream or a soft dark, whichever reads cleanest against the preceding scene). Large, restrained typography states the thesis of the film: "Complex research data." then, replacing it, "Understood clearly." A faint, softly blurred fragment of the Chapter 4 page sits behind the type as texture, not focus.
Sequential/interaction: yes — two short lines replace each other, each held to its floor (~1.2-1.5s).
Audio intent: the swell builds here, resolving toward the outro.
Audio-coupled idea: none beyond the continuing music swell — no ticks, let the words breathe.
Music: gentle swell rising.
Transition mood: soft crossfade → Scene 5

### Scene 5 — The hero close — 6s
Hard cut to a near-black or deep cream field (whichever the render proves cleaner) with the Adanse wordmark centered, full scale, in soft light. Beneath it, the final line resolves: "Your research. Understood." Long hold. Slow fade to black.
Sequential/interaction: none — a single hero hold, no list, no CTA.
Audio intent: quiet resolve — the swell lands and settles.
Audio-coupled idea: one soft, warm resolve tone exactly as the tagline settles; music fades under the final hold.
Music: soft resolve and fade-out.
Transition mood: soft → end

**Music mood for this video:** cinematic, minimal/ambient, slow-building, restrained
**Audio summary:** Near-silence opens the film; a quiet swell carries the logo reveal; the music holds low and steady under the product sequence so six UI states can land clearly; it swells once more through the message beat and resolves gently under the final tagline and fade to black.
