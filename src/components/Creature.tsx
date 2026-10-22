import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type MutableRefObject } from 'react'
import { CreatureGL, cssColor, type CreatureParams, type FrameState } from '../lib/creature'
import { clamp, lerp, prefersReducedMotion } from '../lib/motion'
import { audio } from '../lib/audio'

export type CreatureMotion = { scale: number; center: [number, number] }
export type CreatureTelemetry = { still: number; glow: number; shy: number }
export type CreatureHandle = { poke: () => void }

type Props = {
  params: CreatureParams
  /** Eyes follow the pointer, stillness raises the glow, speed makes it shy. */
  interactive?: boolean
  /** When set (−1 … 1) it overrides the creature's own breathing. */
  breathRef?: MutableRefObject<number | null>
  /** Scroll choreography can push scale / centre here. */
  motionRef?: MutableRefObject<CreatureMotion>
  onTelemetry?: (t: CreatureTelemetry) => void
  label: string
  className?: string
  /** Upper bound on rendered pixels, keeps big canvases cheap. */
  maxPixels?: number
  /** Show a keyboard-reachable "boop" button over the body. */
  pokeable?: boolean
  pokeLabel?: string
}

export const Creature = forwardRef<CreatureHandle, Props>(function Creature(
  { params, interactive = false, breathRef, motionRef, onTelemetry, label, className = '', maxPixels = 2_000_000, pokeable = false, pokeLabel = 'Boop Zommie' },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const paramsRef = useRef(params)
  const telemetryRef = useRef(onTelemetry)
  const pokeRef = useRef<() => void>(() => {})
  const [failed, setFailed] = useState(false)

  paramsRef.current = params
  telemetryRef.current = onTelemetry

  useImperativeHandle(ref, () => ({ poke: () => pokeRef.current() }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let gl: CreatureGL
    try {
      gl = new CreatureGL(canvas)
    } catch {
      setFailed(true)
      return
    }

    const reduced = prefersReducedMotion()
    const now = () => performance.now()
    const st = {
      time: Math.random() * 20,
      look: [0, 0] as [number, number],
      lookT: [0, 0] as [number, number],
      blink: 0,
      blinkStart: -1,
      nextBlink: now() + 1800 + Math.random() * 2500,
      doubleBlink: false,
      squish: 0,
      squishV: 0,
      shy: 0,
      shyT: 0,
      speed: 0,
      lastMove: now(),
      lastPointer: null as null | { x: number; y: number; t: number },
      bonus: 0,
      lastTelemetry: 0,
      started: now(),
    }
    let rect = wrap.getBoundingClientRect()
    let raf = 0
    let last = now()
    let visible = false
    let running = false

    const resize = () => {
      rect = wrap.getBoundingClientRect()
      const area = rect.width * rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(maxPixels / Math.max(area, 1)))
      gl.resize(rect.width, rect.height, dpr)
    }

    const bodyCenter = () => {
      const m = Math.min(rect.width, rect.height)
      const c = motionRef?.current.center ?? [0, 0]
      return { x: rect.left + rect.width / 2 + c[0] * m, y: rect.top + rect.height / 2 - c[1] * m, m }
    }

    const onMove = (e: PointerEvent) => {
      rect = wrap.getBoundingClientRect()
      const t = now()
      const { x, y, m } = bodyCenter()
      const dx = (e.clientX - x) / (m * 0.6)
      const dy = -(e.clientY - y) / (m * 0.6)
      const len = Math.hypot(dx, dy)
      const k = len > 1 ? 1 / len : 1
      st.lookT = [dx * k, dy * k]
      const lp = st.lastPointer
      if (lp) {
        const dist = Math.hypot(e.clientX - lp.x, e.clientY - lp.y)
        const dt = Math.max(t - lp.t, 1)
        st.speed = lerp(st.speed, dist / dt, 0.25)
        if (dist > 2) st.lastMove = t
      }
      st.lastPointer = { x: e.clientX, y: e.clientY, t }
    }

    const poke = () => {
      if (reduced) {
        st.squishV += 2
      } else {
        st.squishV += 7
      }
      st.shy = Math.max(st.shy, 0.6)
      st.lastMove = now() - 1500
      audio.boop()
      if (!running) frame()
    }
    pokeRef.current = poke

    const onDown = (e: PointerEvent) => {
      const { x, y, m } = bodyCenter()
      const r = paramsRef.current.size * (motionRef?.current.scale ?? 1) * m
      if (Math.hypot(e.clientX - x, e.clientY - y) < r * 1.1) poke()
    }

    const frame = () => {
      const t = now()
      const dt = Math.min((t - last) / 1000, 0.05)
      last = t
      const p = paramsRef.current
      const pace = lerp(1.35, 0.35, p.calm) * (reduced ? 0.2 : 1)
      st.time += dt * pace

      // Gaze.
      if (!interactive || !st.lastPointer) {
        const w = (t - st.started) / 1000
        st.lookT = [Math.sin(w * 0.31) * 0.45, Math.cos(w * 0.23) * 0.22 + 0.05]
      }
      const follow = 1 - Math.pow(0.0025, dt)
      st.look[0] = lerp(st.look[0], st.lookT[0], follow)
      st.look[1] = lerp(st.look[1], st.lookT[1], follow)

      // Blinking.
      if (st.blinkStart < 0 && t > st.nextBlink) st.blinkStart = t
      if (st.blinkStart >= 0) {
        const ph = (t - st.blinkStart) / 170
        if (ph >= 1) {
          st.blink = 0
          st.blinkStart = -1
          if (!st.doubleBlink && Math.random() < 0.22) {
            st.doubleBlink = true
            st.nextBlink = t + 120
          } else {
            st.doubleBlink = false
            st.nextBlink = t + 2200 + Math.random() * 4200
          }
        } else st.blink = Math.sin(ph * Math.PI)
      }

      // Squash spring.
      const acc = -90 * st.squish - 9 * st.squishV
      st.squishV += acc * dt
      st.squish = clamp(st.squish + st.squishV * dt, -0.6, 0.9)

      // Shyness from fast pointer movement; glow from stillness.
      st.speed *= Math.pow(0.02, dt)
      st.shyT = interactive ? clamp((st.speed - 0.9) / 2.2, 0, 1) : 0
      st.shy = lerp(st.shy, st.shyT, 1 - Math.pow(st.shyT > st.shy ? 0.02 : 0.25, dt))
      const still = (t - st.lastMove) / 1000
      const bonusT = interactive ? clamp((still - 1) / 9, 0, 1) * 0.45 : 0
      st.bonus = lerp(st.bonus, bonusT, 1 - Math.pow(bonusT > st.bonus ? 0.5 : 0.05, dt))
      const glow = clamp(p.glow + st.bonus - st.shy * 0.25, 0.05, 1)

      const ext = breathRef?.current
      const breath = ext ?? Math.sin(((t - st.started) / 1000) * ((2 * Math.PI) / 10.9))

      const f: FrameState = {
        time: st.time,
        center: motionRef?.current.center ?? [0, 0],
        look: st.look,
        blink: st.blink,
        breath,
        squish: st.squish,
        shy: st.shy,
        glow,
        scale: motionRef?.current.scale ?? 1,
      }
      gl.draw(p, f)

      if (telemetryRef.current && t - st.lastTelemetry > 200) {
        st.lastTelemetry = t
        telemetryRef.current({ still: interactive ? still : 0, glow, shy: st.shy })
      }

      if (visible && !document.hidden) {
        running = true
        raf = requestAnimationFrame(frame)
      } else running = false
    }

    const start = () => {
      if (running || !visible || document.hidden) return
      last = now()
      running = true
      raf = requestAnimationFrame(frame)
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
    })
    io.observe(wrap)
    const ro = new ResizeObserver(() => {
      resize()
      if (!running) frame()
    })
    ro.observe(wrap)
    const onVis = () => start()
    const onScroll = () => {
      rect = wrap.getBoundingClientRect()
    }

    resize()
    frame()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('scroll', onScroll, { passive: true })
    if (interactive) window.addEventListener('pointermove', onMove, { passive: true })
    canvas.addEventListener('pointerdown', onDown)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      gl.dispose()
    }
  }, [interactive, breathRef, motionRef, maxPixels])

  return (
    <div ref={wrapRef} className={`creature ${className}`}>
      {failed ? (
        <div
          className="creature__fallback"
          role="img"
          aria-label={label}
          style={{
            ['--c1' as string]: cssColor(params.hue, 0.78),
            ['--c2' as string]: cssColor(params.hue + 34, 0.3, 0.62),
            ['--s' as string]: String(params.size * 2),
          }}
        >
          <span />
          <span />
        </div>
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={label} />
      )}
      {pokeable && !failed && (
        <button
          type="button"
          className="creature__poke"
          style={{ ['--s' as string]: String(params.size * 2) }}
          onClick={() => pokeRef.current()}
          aria-label={pokeLabel}
        />
      )}
    </div>
  )
})
