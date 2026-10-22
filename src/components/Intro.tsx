import { useEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'
import { useStore } from '../lib/store'

const SEEN_KEY = 'zommie:intro-seen'

function seenThisSession() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

/** A short wake-up: the glyph opens its eyes, the wordmark rises, the curtain lifts. */
export function Intro() {
  const { finishIntro } = useStore()
  const [gone, setGone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const done = () => {
      try {
        sessionStorage.setItem(SEEN_KEY, '1')
      } catch {
        /* private mode: fine */
      }
      setGone(true)
      finishIntro()
    }
    if (prefersReducedMotion() || seenThisSession() || !root.current) {
      done()
      return
    }
    const q = gsap.utils.selector(root)
    const t = gsap.timeline({ onComplete: done })
    t.from(q('.intro__glyph'), { scale: 0, duration: 0.7, ease: 'back.out(2)' })
      .fromTo(q('.intro__eye'), { scaleY: 0.08 }, { scaleY: 1, duration: 0.25, ease: 'power2.out', stagger: 0.04 }, '+=0.05')
      .to(q('.intro__eye'), { scaleY: 0.08, duration: 0.08, yoyo: true, repeat: 1 }, '+=0.25')
      .from(q('.intro__letter'), { yPercent: 120, duration: 0.8, ease: 'expo.out', stagger: 0.035 }, '-=0.45')
      .from(q('.intro__meta'), { opacity: 0, duration: 0.4 }, '<0.2')
      .to(q('.intro__inner'), { yPercent: -30, opacity: 0, duration: 0.6, ease: 'power3.in' }, '+=0.25')
      .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.3')
    tl.current = t

    const skip = () => t.progress(1)
    window.addEventListener('keydown', skip, { once: true })
    return () => {
      window.removeEventListener('keydown', skip)
      t.revert()
    }
  }, [finishIntro])

  if (gone) return null
  return (
    <div className="intro" ref={root} aria-hidden="true">
      <div className="intro__inner">
        <div className="intro__glyph">
          <span className="intro__eye" />
          <span className="intro__eye" />
        </div>
        <p className="intro__word">
          {'zommie'.split('').map((c, i) => (
            <span className="intro__mask" key={i}>
              <span className="intro__letter">{c}</span>
            </span>
          ))}
        </p>
        <p className="intro__meta">waking up…</p>
      </div>
      <button type="button" className="intro__skip" tabIndex={-1} onClick={() => tl.current?.progress(1)}>
        Skip
      </button>
    </div>
  )
}
