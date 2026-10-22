import { useEffect, useMemo, useRef, useState } from 'react'
import { Creature, type CreatureMotion } from '../components/Creature'
import { Eyebrow } from '../components/ui'
import { DEFAULT_PARAMS, type CreatureParams } from '../lib/creature'
import { clamp, lerp, useReducedMotion } from '../lib/motion'

type Phase = {
  name: string
  kanji: string
  title: string
  body: string
  bg: [number, number, number]
  fg: 'light' | 'dark'
  params: Partial<CreatureParams>
}

const PHASES: Phase[] = [
  {
    name: 'Arrive',
    kanji: '来',
    title: 'It wakes slowly — the way you should.',
    body: 'Open the page and give it a moment. The eyes open, the outline finds its shape, the room gets a little dimmer.',
    bg: [38, 20, 44],
    fg: 'light',
    params: { hue: 300, glow: 0.3, wobble: 0.75, calm: 0.3, size: 0.27 },
  },
  {
    name: 'Settle',
    kanji: '静',
    title: 'Move less. It glows more.',
    body: 'Zommie brightens with stillness and flinches at hurry. Rest your hand. Let the cursor drift. Watch it warm up.',
    bg: [14, 24, 44],
    fg: 'light',
    params: { hue: 205, glow: 0.6, wobble: 0.5, calm: 0.55, size: 0.3 },
  },
  {
    name: 'Sink',
    kanji: '深',
    title: 'Its breath becomes your breath.',
    body: 'Five and a half breaths a minute. You won’t notice when you started matching it — only that the noise got quieter.',
    bg: [8, 8, 12],
    fg: 'light',
    params: { hue: 78, glow: 0.9, wobble: 0.3, calm: 0.9, size: 0.33 },
  },
  {
    name: 'Return',
    kanji: '帰',
    title: 'A soft chime. The day resumes.',
    body: 'When your session ends it dims, you stretch, and the tab goes back to being a tab. It will be here next time.',
    bg: [236, 226, 206],
    fg: 'dark',
    params: { hue: 22, glow: 0.45, wobble: 0.55, calm: 0.6, size: 0.28 },
  },
]

function mixParams(a: Partial<CreatureParams>, b: Partial<CreatureParams>, t: number): CreatureParams {
  const out = { ...DEFAULT_PARAMS, ...a }
  for (const k of Object.keys(b) as (keyof CreatureParams)[]) {
    const av = (a[k] ?? DEFAULT_PARAMS[k]) as number
    const bv = b[k] as number
    if (k === 'hue') {
      let d = bv - av
      if (d > 180) d -= 360
      if (d < -180) d += 360
      out.hue = av + d * t
    } else out[k] = lerp(av, bv, t)
  }
  return out
}

const smooth = (t: number) => t * t * (3 - 2 * t)

export function Ritual() {
  const reduced = useReducedMotion()
  const track = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const motion = useRef<CreatureMotion>({ scale: 1, center: [0, 0] })

  useEffect(() => {
    if (reduced) return
    let raf = 0
    const update = () => {
      raf = 0
      const el = track.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      const p = clamp(-r.top / Math.max(total, 1), 0, 1)
      setProgress((prev) => (Math.abs(prev - p) > 0.001 ? p : prev))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  // Continuous position across phases: 0 … PHASES.length − 1.
  const pos = progress * (PHASES.length - 1)
  const i = Math.min(Math.floor(pos), PHASES.length - 2)
  // Hold on each phase, blend quickly between them.
  const local = smooth(clamp((pos - i - 0.35) / 0.3, 0, 1))
  const active = Math.round(i + local)
  const from = PHASES[i]
  const to = PHASES[i + 1]
  const bg = from.bg.map((c, k) => Math.round(lerp(c, to.bg[k], local)))
  const isDark = PHASES[active].fg === 'dark'

  const params = useMemo(() => mixParams(from.params, to.params, local), [from, to, local])

  if (reduced) {
    return (
      <section className="ritual ritual--static section" id="ritual" aria-labelledby="ritual-title">
        <Eyebrow index="02">The ritual</Eyebrow>
        <h2 id="ritual-title" className="display ritual__heading">Four phases of a quiet session.</h2>
        <ol className="ritual__list">
          {PHASES.map((p, k) => (
            <li key={p.name} style={{ background: `rgb(${p.bg.join(' ')})` }} className={p.fg === 'dark' ? 'on-light' : ''}>
              <span className="mono">{String(k + 1).padStart(2, '0')} · {p.name}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
      </section>
    )
  }

  return (
    <section
      className={`ritual ${isDark ? 'on-light' : ''}`}
      id="ritual"
      aria-labelledby="ritual-title"
      style={{ ['--ritual-bg' as string]: `rgb(${bg.join(' ')})` }}
    >
      <div className="ritual__track" ref={track} style={{ height: `${PHASES.length * 100 + 40}vh` }}>
        <div className="ritual__sticky">
          <div className="ritual__head">
            <Eyebrow index="02">The ritual</Eyebrow>
            <h2 id="ritual-title" className="ritual__heading">Four phases of a quiet session</h2>
          </div>

          <div className="ritual__kanji" aria-hidden="true">
            {PHASES.map((p, k) => (
              <span key={p.name} className={k === active ? 'is-active' : ''}>{p.kanji}</span>
            ))}
          </div>

          <div className="ritual__stage">
            <Creature params={params} motionRef={motion} label={`Zommie in the ${PHASES[active].name.toLowerCase()} phase`} maxPixels={900_000} />
          </div>

          <div className="ritual__copy">
            {PHASES.map((p, k) => (
              <article key={p.name} className={`ritual__phase ${k === active ? 'is-active' : ''}`}>
                <p className="ritual__num">
                  <span>{String(k + 1).padStart(2, '0')}</span>
                  <span className="mono">{p.name}</span>
                </p>
                <h3>{p.title}</h3>
                <p className="ritual__body">{p.body}</p>
              </article>
            ))}
          </div>

          <ol className="ritual__ticks" aria-label="Phases">
            {PHASES.map((p, k) => (
              <li key={p.name} className={k === active ? 'is-active' : k < active ? 'is-past' : ''}>
                <span className="mono">{p.name}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
