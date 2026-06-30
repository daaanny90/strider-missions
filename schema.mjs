// Mirror of the Strider app's mission schema (src/domain/schema.ts). Keep in
// sync: this is exactly what CI validates every contributed mission against, so
// a mission that passes here loads in the app.
import { z } from 'zod'

const unlockSchema = z.object({
  type: z.literal('card'),
  id: z.string().min(1),
})

const waypointSchema = z.object({
  id: z.string().min(1),
  at: z.number().nonnegative(),
  name: z.string().min(1),
  lore: z.string().optional(),
  event: z.string().optional(),
  unlock: unlockSchema.optional(),
})

const passageSchema = z.object({
  at: z.number().nonnegative(),
  name: z.string().optional(),
  text: z.string().min(1),
})

const legSchema = z
  .object({
    id: z.string().min(1),
    from: z.string().min(1),
    to: z.string().min(1),
    distanceKm: z.number().positive(),
    waypoints: z.array(waypointSchema),
    passages: z.array(passageSchema).optional(),
  })
  .refine((leg) => leg.waypoints.every((w) => w.at <= leg.distanceKm), {
    message: 'a waypoint `at` exceeds the leg `distanceKm`',
    path: ['waypoints'],
  })
  .refine((leg) => leg.waypoints.every((w, i) => i === 0 || w.at >= leg.waypoints[i - 1].at), {
    message: 'waypoints must be ordered by ascending `at`',
    path: ['waypoints'],
  })
  .refine((leg) => (leg.passages ?? []).every((p) => p.at <= leg.distanceKm), {
    message: 'a passage `at` exceeds the leg `distanceKm`',
    path: ['passages'],
  })
  .refine(
    (leg) => (leg.passages ?? []).every((p, i) => i === 0 || p.at >= (leg.passages ?? [])[i - 1].at),
    { message: 'passages must be ordered by ascending `at`', path: ['passages'] },
  )

const mapSchema = z.object({
  image: z.string().min(1),
  pathId: z.string().min(1),
})

export const missionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  protagonists: z.array(z.string().min(1)).min(1),
  unit: z.literal('km'),
  map: mapSchema,
  legs: z.array(legSchema).min(1),
  hooks: z.record(z.string(), z.unknown()).optional(),
})
