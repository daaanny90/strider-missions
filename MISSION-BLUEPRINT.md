# Strider — Mission Blueprint

Give this whole file to a model, then say e.g. *"Generate a Strider mission for: the
Camino de Santiago (Camino Francés)"* or *"...for Bilbo's journey in The Hobbit"*.
It outputs two files: a mission **YAML** and a stylized **SVG map**. Works for real
routes (Camino, Via Francigena, Appalachian Trail…) and fictional ones.

---

## How Strider works (so your output is correct)

Strider turns logged walking/running distance into progress along a fixed journey.
The journey is **pure data**. The engine:

1. Sums the user's total km.
2. Walks the `legs` (in order), each with a `distanceKm`, to find where the total lands.
3. Places a marker — and every waypoint — on the map **by arc-length fraction**
   (`cumulative_km / total_km`) along a single route `<path>`.

**Consequences you must respect:**

- **Distances are DELTA, never cumulative.** A leg's `distanceKm` is that leg's own
  length. A waypoint's `at` is the offset **from the start of its own leg** (not from
  the journey start, not the gap from the previous waypoint). The engine computes
  cumulative positions itself.
- The **total journey length** = sum of all `distanceKm`. Internal unit is **always
  km** (convert miles → km: ×1.609344).
- You **do not place waypoints on the map**. You draw ONE route line; the app drops
  the dots/marker along it by distance. So the YAML distances and the SVG path are
  independent — they don't need to "line up" by hand.

---

## You produce TWO files

| File | Path | What |
|---|---|---|
| Mission | `src/domain/missions/<id>.yaml` | the data (legs, waypoints, lore) |
| Map | `src/assets/maps/<id>.svg` | a stylized route map (one `<path>`) |

`<id>` is a short kebab-case slug, e.g. `camino-frances`, `the-hobbit`, `via-francigena`.
The YAML's `id` field and both filenames should all use it.

---

## Two content layers: WAYPOINTS vs PASSAGES

Use both. They behave very differently:

- **Waypoint** = a **milestone**. It unlocks a card in the Journal, fires a celebratory
  "tappa raggiunta" overlay when reached, is a tappable dot on the map, and its `lore`
  stays hidden until the user reaches it (or taps "read ahead"). Use for the named,
  meaningful stops (cities, landmarks, key events). Typically **3–8 per leg**.
- **Passage** = **ambient flavour for the stretch BETWEEN waypoints** (landscapes,
  minor places, the feel of the road). NOT a milestone: no unlock, no overlay, not in
  the Journal. It only powers the dashboard "where am I now" readout and the activity
  history. Use to fill long gaps so the journey never feels empty. **~1 every 30–80 km**,
  or one per distinct landscape.

Rule of thumb: if it deserves a "you made it!" moment → waypoint. If it's just what you
pass through → passage.

---

## The mission YAML — schema

Every field below; the file is validated on load and **rejected** if malformed.

```yaml
id: camino-frances              # unique slug; matches the filename
title: "Il Cammino di Santiago" # shown as the journey title
subtitle: "Saint-Jean → Santiago de Compostela"  # optional
kind: real                      # optional but recommended: "real" (a real-world route) or "fiction" (book/imagined). Shows a badge.
description: "Il celebre pellegrinaggio…"  # optional: 1–2 sentence blurb shown in the picker/catalog BEFORE selecting
protagonists: [Pellegrino]      # ≥ 1 names (the traveller / characters)
unit: km                        # literal, always "km"
map:
  image: maps/camino-frances.svg   # path under src/assets/  → maps/<id>.svg
  pathId: camino-route             # MUST equal the <path id="..."> in the SVG (camelCase key!)
legs:                              # ordered; the journey follows them top → bottom
  - id: sjpdp-roncesvalles
    from: Saint-Jean-Pied-de-Port
    to: Roncesvalles
    distanceKm: 25                 # length of THIS leg (a DELTA, > 0)
    waypoints:                     # ordered by ascending `at`; may be empty []
      - id: col-de-lepoeder
        at: 20                     # km from the START of this leg; 0 ≤ at ≤ distanceKm
        name: Col de Lepoeder
        lore: "Valichi i Pirenei: sotto di te la Navarra si apre come un mare verde."
        event: pyrenees_crossing   # optional, free-form id (flavour/future hooks)
        unlock: { type: card, id: pyrenees }   # optional; type is always "card"
      - id: roncesvalles
        at: 25                     # = distanceKm → the leg's end stop
        name: Roncesvalles
        lore: "La collegiata medievale accoglie i pellegrini come mille anni fa."
        unlock: { type: card, id: roncesvalles }
    passages:                      # OPTIONAL ambient stretches; ordered by `at`; at ≤ distanceKm
      - at: 8
        name: "La salita di Orisson"
        text: "Sali ripido tra i pascoli; dietro di te i tetti di Saint-Jean rimpiccioliscono."
  - id: roncesvalles-zubiri
    from: Roncesvalles
    to: Zubiri
    distanceKm: 22
    waypoints:
      - id: zubiri
        at: 22
        name: Zubiri
        lore: "Attraversi il Ponte della Rabbia sul rio Arga ed entri nel paese."
        unlock: { type: card, id: zubiri }
# hooks: {}   # RESERVED — leave it out. Do not invent behaviour here.
```

### Hard rules (or the mission is refused)

- `protagonists`: at least one.
- `unit`: exactly `km`.
- `map.pathId`: **camelCase key** `pathId` (not `path_id`), and its value must match the
  SVG path's `id`.
- Each `leg.distanceKm` > 0.
- Within a leg, `waypoints` are **sorted by ascending `at`**, and every `at` ≤ that leg's
  `distanceKm`. Same for `passages`.
- All `id`s non-empty; waypoint/leg ids unique and slug-style.
- The **last waypoint of each leg usually sits at `at: distanceKm`** (the leg's
  destination), so arriving at the `to` city fires its card. Recommended, not required.

---

## Writing the content

- **Language & voice:** write `lore`, `name`, `title`, `passages.text` in **Italian**,
  present tense, **second person plural ("voi")** — e.g. *"Attraversate il ponte…",
  "Sotto di voi la valle si apre."* (Match the existing app voice.) Keep `id`s in ASCII
  slug form. *(If the human asks for another language, follow that instead.)*
- **Length:** `lore` 1–2 sentences; `passages.text` 1–2 short sentences. Evocative,
  not purple. No emoji.
- **Real routes** (Camino, Francigena, a long-distance trail): use the **real stages and
  approximate stage distances in km** from well-known sources; real place names; what you
  actually see/encounter there (landscape, towns, monuments, the day's character). Treat
  exact km as approximate and don't fabricate precise figures — use commonly-cited ones.
- **Fictional / book routes** (The Hobbit, etc.): follow the **book**, not adaptations;
  paraphrase events in your own words (don't quote copyrighted text); keep all
  IP-specific content in this config only.
- **Tone:** encouraging, never guilt-inducing. The journey is long and should feel
  inviting. No streak/punishment framing.
- Give most waypoints an `unlock: { type: card, id: <slug> }` (drives the Journal
  collection). `event` is optional flavour.

---

## The map SVG — what it must contain

A standalone SVG that the app inlines. Only ONE thing is functional: a single route
**`<path>`** whose `id` equals the YAML `map.pathId`. The app draws the gold "travelled"
line, the waypoint dots and the moving marker **on top**, positioning everything by
arc-length along that path. **Do not draw the dots yourself.**

Requirements:

- A `viewBox` (portrait reads best on phones, e.g. `0 0 800 1180`). Any size is fine;
  the app reads it and scales to width, with pinch-zoom + pan.
- Exactly one **continuous** `<path id="<pathId>" d="…">`. Its **start = journey start**,
  its **end = journey end**. Make it meander to fill the frame; shape is free (the dots
  distribute by distance along it). Style it faint/neutral (the app overlays the bright
  progress + dots on top) — e.g. a thin dotted stroke.
- Optional decorative art (coast, hills, rivers, a compass) — keep it subtle and **on a
  dark background** (the app theme is deep blue-green night). Use literal hex colours.
- Keep everything inside the viewBox. No external images/fonts. Original art only (no
  copyrighted/real copyrighted maps).

### Reusable skeleton (adapt the path + terrain to the topic)

```svg
<svg viewBox="0 0 800 1180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mappa del viaggio">
  <!-- background -->
  <rect width="800" height="1180" fill="#0f1f28"/>
  <!-- faint cartographic grid (optional) -->
  <g stroke="#1c3744" stroke-width="1" opacity="0.5">
    <path d="M0,200 H800 M0,400 H800 M0,600 H800 M0,800 H800 M0,1000 H800"/>
    <path d="M200,0 V1180 M400,0 V1180 M600,0 V1180"/>
  </g>
  <!-- OPTIONAL terrain evoking the topic (hills, coast, forests, rivers)… keep subtle -->

  <!-- THE ROUTE: the only functional element. id MUST match map.pathId.
       Start = journey start, end = journey end. Faint/dotted; the app overlays progress. -->
  <path id="camino-route"
        d="M140,140 C 280,200 300,360 420,420 C 560,490 540,700 460,820 C 400,930 560,980 640,1060"
        fill="none" stroke="#3a5765" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 10"/>
</svg>
```

(For a real route you may shape the path loosely like the real geography — but it is NOT
required; the engine only uses arc-length. A clean evocative meander is enough.)

---

## Final checklist before returning

- [ ] `id` slug consistent across YAML `id`, `<id>.yaml`, `maps/<id>.svg`.
- [ ] `map.pathId` (camelCase) == the SVG `<path id="…">`.
- [ ] Legs ordered; each `distanceKm` > 0; total km is realistic for the topic.
- [ ] In every leg: waypoints (and passages) sorted by ascending `at`, each `at` ≤ `distanceKm`.
- [ ] Most legs end with a waypoint at `at: distanceKm` (the destination).
- [ ] Enough passages to fill long gaps (no empty stretches > ~80 km without flavour).
- [ ] Italian, "voi", present tense; concise; no emoji; book-not-film for fiction.
- [ ] One continuous route path, faint stroke, inside the viewBox, dark-friendly.

Return the two files in fenced blocks, each headed with its target path.
