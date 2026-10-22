import { DEFAULT_PARAMS, type CreatureParams } from './creature'

/** FNV-1a string hash → 32-bit unsigned int. */
export function hashString(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Mulberry32: tiny deterministic PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d

/** Every name grows a different (but always the same) creature. */
export function paramsFromName(name: string): CreatureParams {
  const clean = name.trim().toLowerCase()
  if (!clean) return { ...DEFAULT_PARAMS }
  const r = rng(hashString(clean))
  return {
    hue: Math.round(r() * 360),
    size: round(0.24 + r() * 0.1),
    wobble: round(0.25 + r() * 0.7),
    calm: round(0.2 + r() * 0.75),
    glow: round(0.35 + r() * 0.55),
    eyes: round(r()),
    lobes: 2 + Math.floor(r() * 6),
    seed: round(r(), 3),
  }
}

export function randomParams(): CreatureParams {
  return paramsFromName(Math.random().toString(36).slice(2))
}

const KEYS: (keyof CreatureParams)[] = ['hue', 'size', 'wobble', 'calm', 'glow', 'eyes', 'lobes', 'seed']

export const RANGES: Record<keyof CreatureParams, [number, number]> = {
  hue: [0, 360],
  size: [0.16, 0.4],
  wobble: [0, 1],
  calm: [0, 1],
  glow: [0, 1],
  eyes: [0, 1],
  lobes: [2, 7],
  seed: [0, 1],
}

/** Compact, URL-safe encoding: "name~hue.size.wobble…". */
export function encodeCreature(name: string, p: CreatureParams) {
  const nums = KEYS.map((k) => String(round(p[k], 3))).join('_')
  return `${encodeURIComponent(name.trim().slice(0, 32))}~${nums}`
}

export function decodeCreature(s: string): { name: string; params: CreatureParams } | null {
  const [rawName, rawNums] = s.split('~')
  if (rawNums === undefined) return null
  const vals = rawNums.split('_').map(Number)
  if (vals.length !== KEYS.length || vals.some((v) => !Number.isFinite(v))) return null
  const params = { ...DEFAULT_PARAMS }
  KEYS.forEach((k, i) => {
    const [lo, hi] = RANGES[k]
    params[k] = Math.min(hi, Math.max(lo, vals[i]))
  })
  let name = ''
  try {
    name = decodeURIComponent(rawName).slice(0, 32)
  } catch {
    name = ''
  }
  return { name, params }
}
