# Strider — Mission Catalog

Community journeys for the **Strider** app: real or fictional routes you advance
along by logging your own walking/running distance.

## How it works

- One mission = a folder `missions/<id>/` containing:
  - `mission.yaml` — the journey data (legs, waypoints, lore);
  - `map.svg` — a stylized route map.
- On every Pull Request, CI **validates** the YAML against the mission schema and
  **sanitizes** the SVG (strips scripts, event handlers, external references).
  Invalid or unsafe missions are rejected.
- On merge to `main`, CI regenerates `index.json` and publishes the catalog to
  **GitHub Pages**. The Strider app fetches it so users can install missions.

Catalog URL: `https://daaanny90.github.io/strider-missions/index.json`

## Contribute a mission

1. Read **[MISSION-BLUEPRINT.md](./MISSION-BLUEPRINT.md)** — the full spec. You can
   even hand it to an AI model and ask it to generate a mission for a given topic.
2. Add `missions/<your-id>/mission.yaml` and `missions/<your-id>/map.svg`.
   `<your-id>` is a kebab-case slug and must equal the `id` field in the YAML.
3. (Optional) validate locally: `npm install && npm run validate`.
4. Open a Pull Request. CI must pass; a maintainer reviews and merges.

## Rules

- Mission text (`title`, `lore`, `passages.text`) in **Italian**, present tense,
  second person plural ("voi"). Evocative, concise, no emoji.
- **Real routes**: use the real stages, approximate distances in km, real places.
- **Original content only**: no copyrighted text or maps. For book journeys,
  paraphrase in your own words. No third-party IP in this public repo.
- The map is **one continuous `<path id="…">`** whose id equals `map.pathId`; the
  app draws the progress line, dots and marker itself — do **not** place dots.
  No `<script>`, no external references (they are stripped on publish).
