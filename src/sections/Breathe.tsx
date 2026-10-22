import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Creature } from '../components/Creature'
import { Button, Eyebrow, WordReveal } from '../components/ui'
import { DEFAULT_PARAMS } from '../lib/creature'
import { audio } from '../lib/audio'

type Step = { kind: 'in' | 'hold' | 'out'; s: number }
type Pattern = { id: string; name: string; rhythm: string; note: string; steps: Step[] }

const PATTERNS: Pattern[] = [
  {
    id: 'resonant',
    name: 'Resonant',
    rhythm: '5.5 · 5.5',
    note: 'Even in, even out. Zommie’s own pace.',
    steps: [{ kind: 'in', s: 5.5 }, { kind: 'out', s: 5.5 }],
  },
  {
    id: 'box',
    name: 'Box',
    rhythm: '4 · 4 · 4 · 4',
    note: 'Four sides, four counts each. Steadying.',
    steps: [{ kind: 'in', s: 4 }, { kind: 'hold', s: 4 }, { kind: 'out', s: 4 }, { kind: 'hold', s: 4 }],
  },
  {
    id: 'long-out',
    name: 'Long exhale',
    rhythm: '4 · 7 · 8',
    note: 'A long, slow out-breath. Good before sleep.',
    steps: [{ kind: 'in', s: 4 }, { kind: 'hold', s: 7 }, { kind: 'out', s: 8 }],
  },
]

const LABEL: Record<Step['kind'], string> = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' }
const BREATHE_PARAMS = { ...DEFAULT_PARAMS, hue: 168, size: 0.27, glow: 0.65, calm: 0.85, wobble: 0.35, lobes: 4, seed: 0.62 }
const RING = 2 * Math.PI * 48

export function Breathe() {
  const [pattern, setPattern] = useState(PATTERNS[0])
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(0)
  const [count, setCount] = useState(0)
  const [cycles, setCycles] = useState(0)
  const breathRef = useRef<number | null>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const state = useRef({ step: 0, elapsed: 0, last: 0, value: -1 })

  const reset = () => {
    setRunning(false)
    setStep(0)
    setCycles(0)
    setCount(0)
    state.current = { step: 0, elapsed: 0, last: 0, value: -1 }
    breathRef.current = null
    ringRef.current?.style.setProperty('stroke-dashoffset', String(RING))
  }

  useEffect(() => {
    if (!running) {
      breathRef.current = null
      return
    }
    const st = state.current
    st.last = performance.now()
    let raf = 0
    let shownCount = -1
    const announce = (i: number) => {
      const s = pattern.steps[i]
      audio.breath(s.kind, s.s)
    }
    if (st.elapsed === 0) announce(st.step)

    const tick = () => {
      const now = performance.now()
      st.elapsed += (now - st.last) / 1000
      st.last = now
      let cur = pattern.steps[st.step]
      if (st.elapsed >= cur.s) {
        st.elapsed -= cur.s
        st.step = (st.step + 1) % pattern.steps.length
        if (st.step === 0) setCycles((c) => c + 1)
        setStep(st.step)
        cur = pattern.steps[st.step]
        announce(st.step)
      }
      const t = st.elapsed / cur.s
      const e = 0.5 - 0.5 * Math.cos(Math.PI * t)
      if (cur.kind === 'in') st.value = -1 + 2 * e
      else if (cur.kind === 'out') st.value = 1 - 2 * e
      breathRef.current = st.value
      ringRef.current?.style.setProperty('stroke-dashoffset', String(RING * (1 - t)))
      const c = Math.ceil(cur.s - st.elapsed)
      if (c !== shownCount) {
        shownCount = c
        setCount(c)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, pattern])

  const choose = (p: Pattern) => {
    if (p.id === pattern.id) return
    reset()
    setPattern(p)
    audio.click()
  }

  const current = pattern.steps[step]
  const minutes = pattern.steps.reduce((a, s) => a + s.s, 0)

  return (
    <section className="breathe section" id="breathe" aria-labelledby="breathe-title">
      <div className="breathe__intro">
        <Eyebrow index="03">Breathe</Eyebrow>
        <WordReveal as="h2" className="display display--l" text={'Breathe _with_ it.'} />
        <p className="lede" data-reveal>
          Pick a rhythm and press start. Zommie swells as you breathe in and softens as you breathe out —
          follow its body, or the ring, or the words. Whichever is easiest.
        </p>

        <fieldset className="patterns" data-reveal>
          <legend className="mono dim">Rhythm</legend>
          {PATTERNS.map((p) => (
            <label key={p.id} className={`pattern ${p.id === pattern.id ? 'is-active' : ''}`}>
              <input type="radio" name="pattern" value={p.id} checked={p.id === pattern.id} onChange={() => choose(p)} />
              <span className="pattern__name">{p.name}</span>
              <span className="pattern__rhythm mono">{p.rhythm}</span>
              <span className="pattern__note">{p.note}</span>
            </label>
          ))}
        </fieldset>

        <div className="breathe__controls" data-reveal>
          <Button
            onClick={() => {
              setRunning((r) => !r)
              audio.click()
            }}
            icon={running ? <Pause size={18} /> : <Play size={18} />}
            aria-pressed={running}
          >
            {running ? 'Pause' : cycles || state.current.elapsed ? 'Resume' : 'Start breathing'}
          </Button>
          <Button variant="line" onClick={reset} icon={<RotateCcw size={16} />} disabled={!running && !cycles && !state.current.elapsed}>
            Reset
          </Button>
        </div>
        <p className="mono dim breathe__fine" data-reveal>
          {(60 / minutes).toFixed(1)} breaths / min · a pacing guide, not medical advice. Stop if you feel light-headed.
        </p>
      </div>

      <div className="breathe__stage" data-reveal>
        <svg className="breathe__ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" className="breathe__ring-bg" />
          <circle
            ref={ringRef}
            cx="50"
            cy="50"
            r="48"
            className={`breathe__ring-fg breathe__ring-fg--${current.kind}`}
            style={{ strokeDasharray: RING, strokeDashoffset: RING }}
          />
        </svg>
        <Creature params={BREATHE_PARAMS} breathRef={breathRef} label="Zommie, breathing with you" maxPixels={900_000} />
        <div className="breathe__readout" aria-live="polite" aria-atomic="true">
          {running || cycles ? (
            <>
              <span className="breathe__word" key={`${step}-${cycles}`}>{LABEL[current.kind]}</span>
              <span className="mono breathe__count" aria-hidden="true">{running ? count : 'paused'}</span>
            </>
          ) : (
            <span className="breathe__word breathe__word--idle">Ready when you are</span>
          )}
        </div>
        <p className="mono breathe__cycles">
          <span>cycles</span> <span>{String(cycles).padStart(2, '0')}</span>
        </p>
      </div>
    </section>
  )
}
