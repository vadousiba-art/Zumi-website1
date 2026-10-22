import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Eyebrow, WordReveal } from '../components/ui'
import { cssColor, renderPortrait, type CreatureParams } from '../lib/creature'
import { clamp, scrollToId, useReducedMotion } from '../lib/motion'
import { useStore } from '../lib/store'
import { audio } from '../lib/audio'

type Specimen = { name: string; latin: string; habitat: string; temper: string; params: CreatureParams }

const SPECIMENS: Specimen[] = [
  { name: 'Moss', latin: 'Zommius muscus', habitat: 'Windowsills, unread books', temper: 'Patient. Blinks rarely.', params: { hue: 84, size: 0.3, wobble: 0.45, calm: 0.8, glow: 0.6, eyes: 0.4, lobes: 3, seed: 0.12 } },
  { name: 'Ember', latin: 'Zommius favilla', habitat: 'The last hour before sleep', temper: 'Warm, a little restless.', params: { hue: 16, size: 0.29, wobble: 0.7, calm: 0.35, glow: 0.7, eyes: 0.3, lobes: 5, seed: 0.44 } },
  { name: 'Tidepool', latin: 'Zommius lacuna', habitat: 'Long train rides', temper: 'Drifts. Follows slowly.', params: { hue: 186, size: 0.31, wobble: 0.6, calm: 0.7, glow: 0.55, eyes: 0.6, lobes: 4, seed: 0.71 } },
  { name: 'Lantern', latin: 'Zommius lucerna', habitat: 'Desks after midnight', temper: 'Bright, steady, nosy.', params: { hue: 44, size: 0.32, wobble: 0.3, calm: 0.6, glow: 0.9, eyes: 0.5, lobes: 2, seed: 0.27 } },
  { name: 'Plum', latin: 'Zommius prunum', habitat: 'Rainy Sunday afternoons', temper: 'Shy. Worth the wait.', params: { hue: 302, size: 0.27, wobble: 0.5, calm: 0.75, glow: 0.4, eyes: 0.25, lobes: 3, seed: 0.83 } },
  { name: 'Frost', latin: 'Zommius pruina', habitat: 'Early, cold mornings', temper: 'Crisp outline, calm gaze.', params: { hue: 214, size: 0.28, wobble: 0.22, calm: 0.9, glow: 0.65, eyes: 0.7, lobes: 6, seed: 0.55 } },
  { name: 'Nori', latin: 'Zommius alga', habitat: 'Kitchens, slow dinners', temper: 'Wobbly and content.', params: { hue: 146, size: 0.3, wobble: 0.85, calm: 0.55, glow: 0.5, eyes: 0.45, lobes: 4, seed: 0.06 } },
  { name: 'Dusk', latin: 'Zommius crepusculum', habitat: 'Between two songs', temper: 'Thoughtful. Wide-eyed.', params: { hue: 262, size: 0.3, wobble: 0.55, calm: 0.65, glow: 0.6, eyes: 0.95, lobes: 3, seed: 0.91 } },
]

function useHorizontal() {
  const reduced = useReducedMotion()
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 900px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide && !reduced
}

export function Specimens() {
  const { setLab } = useStore()
  const [images, setImages] = useState<(string | null)[]>(() => SPECIMENS.map(() => null))
  const [failed, setFailed] = useState(false)
  const pinned = useHorizontal()
  const outer = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLOListElement>(null)
  const [travel, setTravel] = useState(0)

  // Draw each portrait once, spread over idle frames.
  useEffect(() => {
    let i = 0
    let id = 0
    const next = () => {
      if (i >= SPECIMENS.length) return
      const url = renderPortrait(SPECIMENS[i].params, 560, 3 + i)
      if (!url) {
        setFailed(true)
        return
      }
      const k = i
      setImages((prev) => prev.map((v, j) => (j === k ? url : v)))
      i++
      id = window.setTimeout(next, 60)
    }
    id = window.setTimeout(next, 400)
    return () => window.clearTimeout(id)
  }, [])

  // Translate the rail horizontally as the tall wrapper scrolls past.
  useEffect(() => {
    if (!pinned) return
    let raf = 0
    const measure = () => {
      const r = rail.current
      if (r) setTravel(Math.max(0, r.scrollWidth - window.innerWidth + 32))
    }
    const update = () => {
      raf = 0
      const o = outer.current
      const r = rail.current
      if (!o || !r) return
      const rect = o.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const p = clamp(-rect.top / Math.max(total, 1), 0, 1)
      r.style.transform = `translate3d(${-p * (r.scrollWidth - window.innerWidth + 32)}px,0,0)`
      o.style.setProperty('--sp', String(p))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const onResize = () => {
      measure()
      on()
    }
    measure()
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
      if (rail.current) rail.current.style.transform = ''
    }
  }, [pinned])

  const adopt = (s: Specimen) => {
    audio.click()
    setLab({ name: s.name, params: { ...s.params } })
    scrollToId('lab')
  }

  const nudge = (dir: number) => {
    const r = rail.current
    if (!r) return
    r.scrollBy({ left: dir * r.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section className={`specimens ${pinned ? 'is-pinned' : ''}`} id="specimens" aria-labelledby="specimens-title">
      <div className="specimens__outer" ref={outer} style={pinned ? { height: `calc(100vh + ${travel}px)` } : undefined}>
        <div className="specimens__sticky">
          <div className="specimens__head section-x">
            <div>
              <Eyebrow index="05">Field guide</Eyebrow>
              <WordReveal as="h2" className="display display--l" text={'Eight known _specimens._'} />
            </div>
            <div className="specimens__side">
              <p className="lede" data-reveal>
                Every Zommie is drawn live from a handful of numbers. These eight are worth knowing.
                Adopt one and it moves into the lab, ready to tune.
              </p>
              {!pinned && (
                <div className="specimens__nav">
                  <button type="button" className="icon-btn" onClick={() => nudge(-1)} aria-label="Previous specimens"><ArrowLeft size={18} /></button>
                  <button type="button" className="icon-btn" onClick={() => nudge(1)} aria-label="Next specimens"><ArrowRight size={18} /></button>
                </div>
              )}
            </div>
          </div>

          <ol className="specimens__rail" ref={rail}>
            {SPECIMENS.map((s, i) => (
              <li className="card" key={s.name} style={{ ['--hue-c' as string]: cssColor(s.params.hue, 0.55), ['--hue-d' as string]: cssColor(s.params.hue + 30, 0.12, 0.5) }}>
                <div className="card__img">
                  {images[i] ? (
                    <img src={images[i]!} alt={`${s.name}, a ${s.temper.toLowerCase().replace(/\.$/, '')} creature`} width={560} height={560} />
                  ) : (
                    <div className={`card__placeholder ${failed ? 'is-failed' : ''}`} aria-hidden="true" />
                  )}
                  <span className="card__index mono">{String(i + 1).padStart(2, '0')} / {String(SPECIMENS.length).padStart(2, '0')}</span>
                </div>
                <div className="card__body">
                  <h3 className="card__name">{s.name}</h3>
                  <p className="card__latin">{s.latin}</p>
                  <dl className="card__meta">
                    <div><dt className="mono dim">Found near</dt><dd>{s.habitat}</dd></div>
                    <div><dt className="mono dim">Temper</dt><dd>{s.temper}</dd></div>
                  </dl>
                  <button type="button" className="card__adopt" onClick={() => adopt(s)}>
                    <span>Adopt into the lab</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {pinned && <div className="specimens__progress" aria-hidden="true"><span /></div>}
        </div>
      </div>
    </section>
  )
}
