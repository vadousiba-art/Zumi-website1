import { useEffect, useRef, useState } from 'react'
import { Check, Dices, Download, Link2, RotateCcw } from 'lucide-react'
import { Creature } from '../components/Creature'
import { Button, Eyebrow, WordReveal } from '../components/ui'
import { DEFAULT_PARAMS, cssColor, renderPortrait, type CreatureParams } from '../lib/creature'
import { RANGES, encodeCreature, paramsFromName, randomParams } from '../lib/seed'
import { useStore } from '../lib/store'
import { audio } from '../lib/audio'

type Control = { key: keyof CreatureParams; label: string; step: number; fmt: (v: number) => string; hint: [string, string] }

const CONTROLS: Control[] = [
  { key: 'hue', label: 'Colour', step: 1, fmt: (v) => `${Math.round(v)}°`, hint: ['', ''] },
  { key: 'size', label: 'Size', step: 0.01, fmt: (v) => `${Math.round(v * 100)}`, hint: ['small', 'large'] },
  { key: 'wobble', label: 'Wobble', step: 0.01, fmt: (v) => `${Math.round(v * 100)}%`, hint: ['round', 'wild'] },
  { key: 'calm', label: 'Calm', step: 0.01, fmt: (v) => `${Math.round(v * 100)}%`, hint: ['restless', 'serene'] },
  { key: 'glow', label: 'Glow', step: 0.01, fmt: (v) => `${Math.round(v * 100)}%`, hint: ['dim', 'radiant'] },
  { key: 'eyes', label: 'Eye spacing', step: 0.01, fmt: (v) => `${Math.round(v * 100)}%`, hint: ['close', 'far'] },
  { key: 'lobes', label: 'Lobes', step: 1, fmt: (v) => `${Math.round(v)}`, hint: ['2', '7'] },
]

function describe(p: CreatureParams) {
  const temper = p.calm > 0.7 ? 'unhurried' : p.calm < 0.35 ? 'fidgety' : 'easygoing'
  const shape = p.wobble > 0.7 ? 'shapeshifting' : p.wobble < 0.3 ? 'smooth-edged' : 'soft-edged'
  const light = p.glow > 0.7 ? 'bright' : p.glow < 0.4 ? 'shy, low-lit' : 'gently lit'
  return `A ${temper}, ${shape}, ${light} specimen.`
}

async function downloadPortrait(name: string, params: CreatureParams) {
  const W = 1080
  const H = 1350
  const img = renderPortrait(params, 1080, 6.3)
  if (!img) throw new Error('WebGL unavailable')
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  const bg = ctx.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.42, H * 0.8)
  bg.addColorStop(0, '#1b1822')
  bg.addColorStop(1, '#0c0b10')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const image = new Image()
  image.src = img
  await image.decode()
  ctx.drawImage(image, 0, H * 0.42 - W / 2, W, W)
  await document.fonts.ready
  ctx.fillStyle = '#ece5d6'
  ctx.textAlign = 'left'
  ctx.font = '500 26px "JetBrains Mono Variable", monospace'
  ctx.globalAlpha = 0.6
  ctx.fillText('ZOMMIE — FIELD PORTRAIT', 80, 110)
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.round(params.hue)}° · ${Math.round(params.lobes)} LOBES`, W - 80, 110)
  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
  ctx.font = 'italic 300 132px "Fraunces Variable", serif'
  ctx.fillText(name.trim() || 'Unnamed', 80, H - 190, W - 160)
  ctx.font = '400 32px "Inter Tight Variable", sans-serif'
  ctx.globalAlpha = 0.7
  ctx.fillText(describe(params), 80, H - 120, W - 160)
  ctx.globalAlpha = 1
  ctx.fillStyle = cssColor(params.hue)
  ctx.fillRect(80, H - 260, 80, 4)
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'))
  if (!blob) throw new Error('Could not encode image')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `zommie-${(name.trim() || 'unnamed').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function Lab() {
  const { lab, setLab } = useStore()
  const { name, params } = lab
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const statusTimer = useRef<number>(0)

  const flash = (kind: 'ok' | 'err', text: string) => {
    setStatus({ kind, text })
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(null), 3200)
  }
  useEffect(() => () => window.clearTimeout(statusTimer.current), [])

  const set = (key: keyof CreatureParams, v: number) => setLab((s) => ({ ...s, params: { ...s.params, [key]: v } }))

  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}#lab/${encodeCreature(name, params)}`
    try {
      await navigator.clipboard.writeText(url)
      flash('ok', 'Link copied. Anyone who opens it meets this exact creature.')
    } catch {
      history.replaceState(null, '', `#lab/${encodeCreature(name, params)}`)
      flash('err', 'Clipboard blocked — the link is now in your address bar instead.')
    }
  }

  const download = async () => {
    setBusy(true)
    try {
      await downloadPortrait(name, params)
      flash('ok', 'Portrait saved to your downloads.')
    } catch {
      flash('err', 'Couldn’t draw the portrait in this browser (WebGL is required).')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="lab section" id="lab" aria-labelledby="lab-title">
      <div className="lab__head">
        <Eyebrow index="04">Grow your own</Eyebrow>
        <WordReveal as="h2" className="display display--l" text={'Every name grows\na _different_ one.'} />
      </div>

      <div className="lab__grid">
        <div className="lab__stage" style={{ ['--hue-c' as string]: cssColor(params.hue, 0.5) }}>
          <div className="lab__frame">
            <span className="lab__corner lab__corner--tl" aria-hidden="true" />
            <span className="lab__corner lab__corner--tr" aria-hidden="true" />
            <span className="lab__corner lab__corner--bl" aria-hidden="true" />
            <span className="lab__corner lab__corner--br" aria-hidden="true" />
            <Creature params={params} interactive pokeable pokeLabel="Boop your creature" label={`Your creature${name ? `, ${name}` : ''}`} maxPixels={1_000_000} />
            <div className="lab__tag">
              <p className="lab__name">{name.trim() || 'Unnamed'}</p>
              <p className="mono dim">{describe(params)}</p>
            </div>
          </div>
        </div>

        <form className="lab__panel" onSubmit={(e) => e.preventDefault()} aria-label="Creature controls">
          <label className="field">
            <span className="mono dim">Name</span>
            <input
              type="text"
              value={name}
              maxLength={32}
              placeholder="Type any name…"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                const v = e.target.value
                setLab({ name: v, params: paramsFromName(v) })
              }}
            />
            <span className="field__hint">The same name always grows the same creature. Then tune it below.</span>
          </label>

          <div className="sliders">
            {CONTROLS.map((c) => {
              const [lo, hi] = RANGES[c.key]
              const v = params[c.key]
              const pct = ((v - lo) / (hi - lo)) * 100
              return (
                <label key={c.key} className={`slider slider--${c.key}`} style={{ ['--p' as string]: `${pct}%`, ['--hue-c' as string]: cssColor(params.hue) }}>
                  <span className="slider__top">
                    <span>{c.label}</span>
                    <span className="mono">{c.fmt(v)}</span>
                  </span>
                  <input
                    type="range"
                    min={lo}
                    max={hi}
                    step={c.step}
                    value={v}
                    onChange={(e) => set(c.key, Number(e.target.value))}
                  />
                  {c.hint[0] && (
                    <span className="slider__hint mono dim" aria-hidden="true">
                      <span>{c.hint[0]}</span>
                      <span>{c.hint[1]}</span>
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          <div className="lab__actions">
            <Button
              variant="line"
              icon={<Dices size={16} />}
              onClick={() => {
                audio.click()
                setLab((s) => ({ ...s, params: randomParams() }))
              }}
            >
              Randomize
            </Button>
            <Button
              variant="line"
              icon={<RotateCcw size={16} />}
              onClick={() => setLab({ name: '', params: { ...DEFAULT_PARAMS } })}
            >
              Reset
            </Button>
            <Button variant="line" icon={<Link2 size={16} />} onClick={copyLink}>Copy link</Button>
            <Button icon={busy ? undefined : <Download size={16} />} onClick={download} disabled={busy} aria-busy={busy}>
              {busy ? 'Drawing…' : 'Save portrait'}
            </Button>
          </div>
          <p className={`lab__status ${status ? `is-${status.kind}` : ''}`} role="status" aria-live="polite">
            {status && (
              <>
                {status.kind === 'ok' && <Check size={14} aria-hidden="true" />} {status.text}
              </>
            )}
          </p>
        </form>
      </div>
    </section>
  )
}
