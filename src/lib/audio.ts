/**
 * Optional, synthesized sound. Nothing is downloaded and nothing plays until
 * the visitor switches sound on (which also satisfies autoplay policies).
 */
class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private pad: { stop: () => void } | null = null
  enabled = false

  private ensure() {
    if (this.ctx) return this.ctx
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  get supported() {
    return typeof window !== 'undefined' && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)
  }

  async setEnabled(on: boolean) {
    this.enabled = on
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    if (on) {
      if (ctx.state === 'suspended') await ctx.resume()
      this.startPad()
      this.master.gain.cancelScheduledValues(ctx.currentTime)
      this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6)
    } else {
      this.master.gain.cancelScheduledValues(ctx.currentTime)
      this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
      window.setTimeout(() => {
        if (!this.enabled) {
          this.pad?.stop()
          this.pad = null
        }
      }, 1200)
    }
  }

  /** A low, slowly breathing chord. */
  private startPad() {
    const ctx = this.ctx
    if (!ctx || !this.master || this.pad) return
    const out = ctx.createGain()
    out.gain.value = 0.05
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 520
    filter.Q.value = 0.6
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.09
    lfoGain.gain.value = 220
    lfo.connect(lfoGain).connect(filter.frequency)
    const notes = [110, 164.81, 220.5, 277.18]
    const oscs = notes.map((f, i) => {
      const o = ctx.createOscillator()
      o.type = i % 2 ? 'triangle' : 'sine'
      o.frequency.value = f
      o.detune.value = (i - 1.5) * 4
      const g = ctx.createGain()
      g.gain.value = i === 0 ? 0.6 : 0.28
      o.connect(g).connect(filter)
      o.start()
      return o
    })
    filter.connect(out).connect(this.master)
    lfo.start()
    this.pad = {
      stop: () => {
        oscs.forEach((o) => o.stop())
        lfo.stop()
        out.disconnect()
      },
    }
  }

  private tone(freq: number, dur: number, opts: { to?: number; gain?: number; type?: OscillatorType; delay?: number } = {}) {
    if (!this.enabled) return
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t0 = ctx.currentTime + (opts.delay ?? 0)
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = opts.type ?? 'sine'
    o.frequency.setValueAtTime(freq, t0)
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur)
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(opts.gain ?? 0.12, t0 + Math.min(0.04, dur / 4))
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g).connect(this.master)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
  }

  boop() {
    this.tone(660, 0.28, { to: 330, gain: 0.1 })
  }

  click() {
    this.tone(1200, 0.06, { gain: 0.03, type: 'triangle' })
  }

  /** A soft glide for each breathing phase. */
  breath(kind: 'in' | 'hold' | 'out', seconds: number) {
    const d = Math.max(0.6, seconds)
    if (kind === 'in') this.tone(196, d, { to: 293.66, gain: 0.05 })
    else if (kind === 'out') this.tone(293.66, d, { to: 174.61, gain: 0.05 })
    else this.tone(246.94, Math.min(d, 1.2), { gain: 0.025 })
  }

  chime() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, 2.4, { gain: 0.06, delay: i * 0.18 }),
    )
  }
}

export const audio = new AudioEngine()
