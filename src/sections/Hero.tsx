import { useEffect, useRef } from 'react'
import { ArrowDown, Wind } from 'lucide-react'
import { Creature, type CreatureMotion, type CreatureTelemetry } from '../components/Creature'
import { Button, LinkButton, WordReveal } from '../components/ui'
import { DEFAULT_PARAMS } from '../lib/creature'
import { gsap, prefersReducedMotion } from '../lib/motion'
import { useStore } from '../lib/store'

const HERO_PARAMS = { ...DEFAULT_PARAMS, size: 0.32, glow: 0.5 }

function fmt(s: number) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export function Hero() {
  const { introDone, openSession } = useStore()
  const root = useRef<HTMLElement>(null)
  const motion = useRef<CreatureMotion>({ scale: 1, center: [0, 0] })
  const stillRef = useRef<HTMLSpanElement>(null)
  const glowRef = useRef<HTMLSpanElement>(null)
  const meterRef = useRef<HTMLSpanElement>(null)
  const moodRef = useRef<HTMLSpanElement>(null)

  const onTelemetry = (t: CreatureTelemetry) => {
    if (stillRef.current) stillRef.current.textContent = fmt(t.still)
    if (glowRef.current) glowRef.current.textContent = `${Math.round(t.glow * 100)}%`
    meterRef.current?.style.setProperty('transform', `scaleX(${t.glow})`)
    if (moodRef.current) {
      const mood = t.shy > 0.35 ? 'startled — slow down' : t.still > 10 ? 'glowing' : t.still > 3 ? 'settling' : 'watching you'
      if (moodRef.current.textContent !== mood) moodRef.current.textContent = mood
    }
  }

  // Entrance after the intro, then scroll-linked depth.
  useEffect(() => {
    const el = root.current
    if (!el || !introDone) return
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) return
      gsap.from('.hero__stage', { opacity: 0, scale: 0.85, duration: 1.8, ease: 'expo.out' })
      gsap.from('.hero__fade', { opacity: 0, y: 24, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: 0.5 })

      gsap.to(motion.current, {
        scale: 0.55,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to('.hero__stage', {
        yPercent: 18,
        opacity: 0.2,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to('.hero__title', {
        yPercent: -30,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
      })
    }, el)
    return () => ctx.revert()
  }, [introDone])

  // Pointer light on the backdrop.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [])

  return (
    <section className="hero" id="top" ref={root} aria-labelledby="hero-title">
      <div className="hero__light" aria-hidden="true" />
      <div className="hero__stage">
        <Creature
          params={HERO_PARAMS}
          interactive
          pokeable
          motionRef={motion}
          onTelemetry={onTelemetry}
          label="Zommie, a soft glowing creature with two dark eyes that follow your pointer"
          maxPixels={1_600_000}
        />
      </div>

      <div className="hero__top hero__fade">
        <p className="mono">Nº 001 — a creature for the browser</p>
        <p className="mono hero__hint">
          <span className="dot" aria-hidden="true" /> tap it, or hold still
        </p>
      </div>

      <div className="hero__content">
        <WordReveal
          as="h1"
          className="hero__title display"
          text={'A _quiet_ creature\nfor loud days.'}
          play={introDone}
          delay={0.15}
          stagger={0.07}
        />
        <div className="hero__aside">
          <p className="hero__lede hero__fade">
            Zommie is a small, luminous thing that lives on this page. It breathes slowly, watches your
            cursor, and glows a little brighter every moment you stay still.
          </p>
          <div className="hero__ctas hero__fade">
            <LinkButton href="#breathe" icon={<Wind size={18} />}>Breathe with it</LinkButton>
            <Button variant="ghost" onClick={() => openSession()}>Start a quiet session</Button>
          </div>
        </div>
      </div>

      <div className="hero__readout hero__fade" aria-live="off">
        <div>
          <span className="mono dim">stillness</span>
          <span className="mono" ref={stillRef}>00:00</span>
        </div>
        <div>
          <span className="mono dim">glow</span>
          <span className="mono" ref={glowRef}>50%</span>
        </div>
        <div className="hero__meter" aria-hidden="true"><span ref={meterRef} /></div>
        <span className="mono hero__mood" ref={moodRef}>watching you</span>
      </div>

      <a href="#about" className="hero__scroll hero__fade" aria-label="Scroll to learn more">
        <ArrowDown size={16} aria-hidden="true" />
        <span className="mono">scroll, slowly</span>
      </a>
    </section>
  )
}
