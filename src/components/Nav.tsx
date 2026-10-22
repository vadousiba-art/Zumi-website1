import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Volume2, VolumeX } from 'lucide-react'
import { useStore } from '../lib/store'
import { gsap, prefersReducedMotion, scrollToId } from '../lib/motion'
import { audio } from '../lib/audio'

export const SECTIONS = [
  { id: 'about', label: 'What it is', note: 'A creature that wants nothing' },
  { id: 'ritual', label: 'The ritual', note: 'Four phases of a quiet session' },
  { id: 'breathe', label: 'Breathe', note: 'Pace your breath with it' },
  { id: 'lab', label: 'Grow your own', note: 'Every name grows a different one' },
  { id: 'specimens', label: 'Field guide', note: 'Eight known specimens' },
  { id: 'promises', label: 'Promises', note: 'What it will never do' },
  { id: 'stay', label: 'Stay a while', note: 'Begin a focus session' },
]

export function Logo() {
  return (
    <span className="logo">
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 3c7 0 12.5 4.6 12.5 12.3C28.5 23 23 29 16 29S3.5 23 3.5 15.3C3.5 7.6 9 3 16 3z" fill="currentColor" />
        <ellipse className="logo__eye" cx="12" cy="15.5" rx="1.6" ry="2.4" />
        <ellipse className="logo__eye" cx="20" cy="15.5" rx="1.6" ry="2.4" />
      </svg>
      <span className="logo__word">zommie</span>
    </span>
  )
}

export function Nav() {
  const { sound, toggleSound, openSession } = useStore()
  const [open, setOpen] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const [hidden, setHidden] = useState(false)

  // Scroll progress + hide-on-scroll-down.
  useEffect(() => {
    let lastY = window.scrollY
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? window.scrollY / max : 0
      bar.current?.style.setProperty('transform', `scaleX(${p})`)
      const y = window.scrollY
      if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > 300)
        lastY = y
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Overlay open / close choreography, focus management and Escape.
  useEffect(() => {
    const el = overlay.current
    if (!el) return
    document.documentElement.classList.toggle('menu-open', open)
    const reduced = prefersReducedMotion()
    const items = el.querySelectorAll('.menu__item, .menu__foot > *')
    if (open) {
      gsap.killTweensOf([el, items])
      gsap.set(el, { visibility: 'visible' })
      if (reduced) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, clipPath: 'circle(150% at 100% 0%)' })
      else {
        gsap.fromTo(el, { clipPath: 'circle(0% at calc(100% - 3rem) 2.4rem)' }, { clipPath: 'circle(150% at calc(100% - 3rem) 2.4rem)', duration: 0.9, ease: 'expo.inOut' })
        gsap.fromTo(items, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.04, delay: 0.3 })
      }
      el.querySelector<HTMLElement>('.menu__item a')?.focus({ preventScroll: true })
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false)
        if (e.key === 'Tab') {
          const f = [menuBtn.current, ...el.querySelectorAll<HTMLElement>('a, button')].filter(Boolean) as HTMLElement[]
          const i = f.indexOf(document.activeElement as HTMLElement)
          if (e.shiftKey && i <= 0) {
            e.preventDefault()
            f[f.length - 1].focus()
          } else if (!e.shiftKey && i === f.length - 1) {
            e.preventDefault()
            f[0].focus()
          }
        }
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    } else if (el.style.visibility === 'visible') {
      gsap.killTweensOf([el, items])
      gsap.to(el, {
        clipPath: reduced ? undefined : 'circle(0% at calc(100% - 3rem) 2.4rem)',
        opacity: reduced ? 0 : 1,
        duration: reduced ? 0.15 : 0.7,
        ease: 'expo.inOut',
        onComplete: () => {
          gsap.set(el, { visibility: 'hidden', opacity: 1 })
        },
      })
    }
  }, [open])

  const go = (id: string) => {
    audio.click()
    setOpen(false)
    window.setTimeout(() => scrollToId(id), prefersReducedMotion() ? 0 : 350)
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={`nav ${hidden && !open ? 'nav--hidden' : ''} ${open ? 'nav--open' : ''}`}>
        <a href="#top" className="nav__logo" aria-label="Zommie, back to top" onClick={(e) => { e.preventDefault(); setOpen(false); scrollToId('top') }}>
          <Logo />
        </a>
        <div className="nav__right">
          <button
            type="button"
            className="nav__chip"
            onClick={toggleSound}
            aria-pressed={sound}
            disabled={!audio.supported}
            title={audio.supported ? undefined : 'Audio is not supported in this browser'}
          >
            {sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
            <span className="nav__chip-label">Sound {sound ? 'on' : 'off'}</span>
            <span className={`nav__eq ${sound ? 'is-on' : ''}`} aria-hidden="true"><i /><i /><i /></span>
          </button>
          <button
            ref={menuBtn}
            type="button"
            className="nav__menu"
            aria-expanded={open}
            aria-controls="menu"
            onClick={() => {
              audio.click()
              setOpen((o) => !o)
            }}
          >
            <span className="nav__menu-label">{open ? 'Close' : 'Menu'}</span>
            <span className="nav__burger" aria-hidden="true"><i /><i /></span>
          </button>
        </div>
        <div className="nav__progress" aria-hidden="true"><div ref={bar} /></div>
      </header>

      <div id="menu" className="menu" ref={overlay} role="dialog" aria-modal="true" aria-label="Site menu" style={{ visibility: 'hidden' }}>
        <nav aria-label="Sections">
          <ol className="menu__list">
            {SECTIONS.map((s, i) => (
              <li className="menu__item" key={s.id}>
                <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); go(s.id) }}>
                  <span className="menu__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="menu__label" data-text={s.label}><span>{s.label}</span></span>
                  <span className="menu__note">{s.note}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="menu__foot">
          <p>No accounts. No notifications. Nothing leaves your device.</p>
          <button
            type="button"
            className="menu__cta"
            onClick={() => {
              setOpen(false)
              openSession()
            }}
          >
            Begin a quiet session <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  )
}
