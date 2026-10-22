import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Plus, X } from 'lucide-react'
import { Creature } from './Creature'
import { Button } from './ui'
import { DEFAULT_PARAMS } from '../lib/creature'
import { gsap, prefersReducedMotion } from '../lib/motion'
import { useStore } from '../lib/store'
import { audio } from '../lib/audio'

const SESSION_PARAMS = { ...DEFAULT_PARAMS, size: 0.26, calm: 0.85, glow: 0.7 }
const DONE_PARAMS = { ...SESSION_PARAMS, hue: 28, glow: 0.45, calm: 0.6 }

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Full-screen focus timer. Runs entirely in this tab; nothing is scheduled elsewhere. */
export function Session() {
  const { sessionOpen, sessionMinutes, closeSession } = useStore()
  if (!sessionOpen) return null
  return <SessionDialog minutes={sessionMinutes} onClose={closeSession} />
}

function SessionDialog({ minutes, onClose }: { minutes: number; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [total, setTotal] = useState(minutes * 60_000)
  const [remaining, setRemaining] = useState(minutes * 60_000)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const endAt = useRef(performance.now() + minutes * 60_000)
  const pausedLeft = useRef(0)
  const returnFocus = useRef<Element | null>(document.activeElement)

  // Enter animation, focus, Escape and a simple focus trap.
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (!prefersReducedMotion()) {
      gsap.fromTo(el, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.9, ease: 'expo.inOut' })
      gsap.from(el.querySelectorAll('.session__fade'), { opacity: 0, y: 20, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.5 })
    }
    el.querySelector<HTMLElement>('.session__primary')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const f = [...el.querySelectorAll<HTMLElement>('button:not([disabled])')]
        const i = f.indexOf(document.activeElement as HTMLElement)
        if (e.shiftKey && i <= 0) {
          e.preventDefault()
          f[f.length - 1]?.focus()
        } else if (!e.shiftKey && i === f.length - 1) {
          e.preventDefault()
          f[0]?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    const prevTitle = document.title
    const focusTarget = returnFocus.current
    return () => {
      window.removeEventListener('keydown', onKey)
      document.title = prevTitle
      if (focusTarget instanceof HTMLElement) focusTarget.focus({ preventScroll: true })
    }
  }, [onClose])

  // Ticking.
  useEffect(() => {
    if (paused || done) return
    const id = window.setInterval(() => {
      const left = endAt.current - performance.now()
      setRemaining(left)
      document.title = `${fmt(left)} · Zommie`
      if (left <= 0) {
        setDone(true)
        document.title = 'Welcome back · Zommie'
        audio.chime()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [paused, done])

  const togglePause = () => {
    audio.click()
    if (paused) {
      endAt.current = performance.now() + pausedLeft.current
      setPaused(false)
    } else {
      pausedLeft.current = endAt.current - performance.now()
      setPaused(true)
    }
  }

  const addFive = () => {
    audio.click()
    if (paused) pausedLeft.current += 300_000
    else endAt.current += 300_000
    setTotal((t) => t + 300_000)
    setRemaining((r) => r + 300_000)
  }

  const progress = done ? 1 : 1 - Math.max(remaining, 0) / total

  return (
    <div className={`session ${done ? 'is-done' : ''}`} ref={root} role="dialog" aria-modal="true" aria-labelledby="session-title">
      <div className="session__top session__fade">
        <p className="mono dim" id="session-title">Quiet session · {Math.round(total / 60_000)} min</p>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="End session and close">
          <X size={18} />
        </button>
      </div>

      <div className="session__stage">
        <Creature params={done ? DONE_PARAMS : SESSION_PARAMS} pokeable pokeLabel="Boop Zommie (session)" label="Zommie, keeping you company" maxPixels={1_400_000} />
      </div>

      <div className="session__bottom">
        {done ? (
          <div className="session__done session__fade">
            <p className="session__time display">Welcome back.</p>
            <p className="lede">That was {Math.round(total / 60_000)} quiet minutes. Stretch, drink some water, carry on.</p>
            <Button className="session__primary" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <p className="session__time display session__fade" aria-live="off">{fmt(paused ? pausedLeft.current : remaining)}</p>
            <p className="session__hint mono dim session__fade">
              {paused ? 'paused — it’ll wait' : 'breathe with its body · move as little as you like'}
            </p>
            <div className="session__controls session__fade">
              <Button className="session__primary" onClick={togglePause} icon={paused ? <Play size={16} /> : <Pause size={16} />}>
                {paused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="line" onClick={addFive} icon={<Plus size={16} />}>5 min</Button>
            </div>
          </>
        )}
        <div className="session__bar" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
      </div>
    </div>
  )
}
