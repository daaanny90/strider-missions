// Validate every mission and build the published catalog.
//   node scripts/build-catalog.mjs --check   → validate only (CI on PRs)
//   node scripts/build-catalog.mjs           → validate + write _site/ (deploy)
//
// Each mission folder must contain mission.yaml (schema-valid) and map.svg
// (sanitized; must still contain the route <path id> after sanitizing). The
// published SVG is the SANITIZED one, so even a hostile contribution can't ship
// a script or external reference.
import { readdir, readFile, writeFile, mkdir, cp } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import { missionSchema } from '../schema.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const MISSIONS_DIR = join(ROOT, 'missions')
const OUT = join(ROOT, '_site')

const { window } = new JSDOM('')
const DOMPurify = createDOMPurify(window)

function sanitizeSvg(raw) {
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'image', 'use', 'a', 'style'],
    FORBID_ATTR: ['href', 'xlink:href'],
  })
}

function svgHasPathId(svg, pathId) {
  const doc = new window.DOMParser().parseFromString(svg, 'image/svg+xml')
  if (doc.getElementsByTagName('parsererror').length > 0) return false
  return doc.getElementById(pathId) !== null
}

const checkOnly = process.argv.includes('--check')
const errors = []
const entries = []

const dirents = await readdir(MISSIONS_DIR, { withFileTypes: true }).catch(() => [])
for (const d of dirents.filter((x) => x.isDirectory())) {
  const id = d.name
  const base = join(MISSIONS_DIR, id)

  let yamlText
  let svgRaw
  try {
    yamlText = await readFile(join(base, 'mission.yaml'), 'utf8')
  } catch {
    errors.push(`${id}: missing mission.yaml`)
    continue
  }
  try {
    svgRaw = await readFile(join(base, 'map.svg'), 'utf8')
  } catch {
    errors.push(`${id}: missing map.svg`)
    continue
  }

  let data
  try {
    data = parseYaml(yamlText)
  } catch (err) {
    errors.push(`${id}: invalid YAML — ${err.message}`)
    continue
  }

  const result = missionSchema.safeParse(data)
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    errors.push(`${id}: schema — ${detail}`)
    continue
  }

  const mission = result.data
  if (mission.id !== id) {
    errors.push(`${id}: YAML id ("${mission.id}") must equal the folder name`)
    continue
  }

  const clean = sanitizeSvg(svgRaw)
  if (!svgHasPathId(clean, mission.map.pathId)) {
    errors.push(`${id}: map.svg has no <path id="${mission.map.pathId}"> after sanitizing (unsafe or missing route)`)
    continue
  }

  entries.push({ id, mission, clean })
}

if (errors.length > 0) {
  console.error('Validation failed:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

entries.sort((a, b) => (a.id < b.id ? -1 : 1))
console.log(`OK: ${entries.length} valid mission(s).`)
if (checkOnly) process.exit(0)

await mkdir(OUT, { recursive: true })
const index = { version: 1, missions: [] }
for (const { id, mission, clean } of entries) {
  const dir = join(OUT, 'missions', id)
  await mkdir(dir, { recursive: true })
  await cp(join(MISSIONS_DIR, id, 'mission.yaml'), join(dir, 'mission.yaml'))
  await writeFile(join(dir, 'map.svg'), clean) // publish the SANITIZED svg
  index.missions.push({
    id,
    title: mission.title,
    subtitle: mission.subtitle,
    kind: mission.kind,
    description: mission.description,
    distanceKm: Math.round(mission.legs.reduce((s, l) => s + l.distanceKm, 0)),
    legs: mission.legs.length,
    waypoints: mission.legs.reduce((s, l) => s + l.waypoints.length, 0),
    yaml: `missions/${id}/mission.yaml`,
    svg: `missions/${id}/map.svg`,
  })
}
await writeFile(join(OUT, 'index.json'), JSON.stringify(index, null, 2))
console.log(`Wrote _site/ with ${index.missions.length} mission(s).`)
