import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ArrowUpRight } from 'lucide-react'
import { Button, Eyebrow } from '../components/ui'
import { Logo, SECTIONS } from '../components/Nav'
import { gsap, prefersReducedMotion, scrollToId } from '../lib/motion'
import { useStore } from '../lib/store'
import { audio } from '../lib/audio'

const DURATIONS = [10, 25, 50]

export function Closing() {
  const { openSession } = useStore()
  const [minutes, setMinutes] = useState(25)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('.stay__letter', {
        yPercent: 110,
        duration: 1.3,
        ease: 'expo.out',
        stagger: 0.05,
        scrollTrigger: { trigger: '.stay__title', start: 'top 85%', once: true },
      })
      gsap.fromTo('.stay__orb', { scale: 0.6, opacity: 0 }, {
        scale: 1.15,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: true },
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="stay" id="stay" ref={ref} aria-labelledby="stay-title">
      <div className="stay__orb" aria-hidden="true" />
      <Eyebrow index="07">Stay a while</Eyebrow>
      <h2 className="stay__title" id="stay-title" aria-label="Stay a while.">
        {['Stay', 'a while.'].map((line, li) => (
          <span className="stay__line" key={line} aria-hidden="true">
            {line.split('').map((ch, i) => (
              <span className="stay__mask" key={i}>
                <span className={`stay__letter ${li === 1 ? 'is-em' : ''}`}>{ch === ' ' ? ' ' : ch}</span>
              </span>
            ))}
          </span>
        ))}
      </h2>
      <div className="stay__body">
        <p className="lede" data-reveal>
          A focus session is just a timer with company. Choose a length, put your phone face-down, and let the
          creature hold the time for you. When it ends, a soft chime — if sound is on — and nothing else.
        </p>
        <div className="stay__picker" role="radiogroup" aria-label="Session length" data-reveal>
          {DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={m === minutes}
              className={`chip ${m === minutes ? 'is-active' : ''}`}
              onClick={() => {
                audio.click()
                setMinutes(m)
              }}
            >
              <span className="chip__n">{m}</span>
              <span className="mono">min</span>
            </button>
          ))}
        </div>
        <div data-reveal>
          <Button size="lg" icon={<ArrowUpRight size={20} />} onClick={() => openSession(minutes)}>
            Begin a {minutes}-minute session
          </Button>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 20_000)
    return () => window.clearInterval(id)
  }, [])
  const h = time.getHours()
  const mood =
    h < 5 ? 'Late. A good time to be quiet.' : h < 11 ? 'Morning. Start slow.' : h < 17 ? 'Afternoon. Take one long breath.' : h < 22 ? 'Evening. Let the day settle.' : 'Late. A good time to be quiet.'

  return (
    <footer className="footer">
      <div className="footer__grid">
        <div className="footer__brand">
          <Logo />
          <p className="footer__clock">
            <span className="mono dim">Where you are</span>
            <span className="footer__time">{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            <span>{mood}</span>
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="mono dim">Explore</p>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); scrollToId(s.id) }}>{s.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="footer__about">
          <p className="mono dim">Made of</p>
          <p>
            One fragment shader, a little Web Audio, and a lot of negative space. Runs entirely in your browser — no
            accounts, no cookies, no tracking.
          </p>
          <button type="button" className="footer__top" onClick={() => scrollToId('top')}>
            <ArrowUp size={16} aria-hidden="true" /> Back to the top
          </button>
        </div>
      </div>
      <p className="footer__word" aria-hidden="true">zommie</p>
      <div className="footer__base mono dim">
        <span>© {time.getFullYear()} Zommie</span>
        <span>Be gentle with yourself.</span>
      </div>
    </footer>
  )
}
