/**
 * Zommie's body is a single full-screen fragment shader: a noisy, breathing
 * signed-distance blob with a rim light, a soft halo, two eyes that track a
 * look vector, and a few drifting spores. Everything is drawn premultiplied
 * so the canvas composites cleanly over whatever CSS background sits behind it.
 */

export type CreatureParams = {
  /** Base hue in degrees. */
  hue: number
  /** Body radius in min-dimension units (0.16 – 0.4). */
  size: number
  /** How much the outline wanders (0 – 1). */
  wobble: number
  /** 0 = restless, 1 = very slow. */
  calm: number
  /** Resting brightness (0 – 1). */
  glow: number
  /** Eye spacing (0 – 1). */
  eyes: number
  /** Number of soft lobes in the outline (2 – 7). */
  lobes: number
  /** Arbitrary seed that offsets the noise field. */
  seed: number
}

export const DEFAULT_PARAMS: CreatureParams = {
  hue: 78,
  size: 0.3,
  wobble: 0.55,
  calm: 0.6,
  glow: 0.55,
  eyes: 0.45,
  lobes: 3,
  seed: 0.37,
}

export type FrameState = {
  time: number
  /** Body centre offset in min-dimension units. */
  center: [number, number]
  /** Where the eyes look, roughly −1 … 1. */
  look: [number, number]
  /** 0 = open, 1 = closed. */
  blink: number
  /** −1 … 1, exhale → inhale. */
  breath: number
  /** Spring-driven squash on poke. */
  squish: number
  /** 0 … 1, how much it squints. */
  shy: number
  /** 0 … 1, final brightness (resting glow plus stillness bonus). */
  glow: number
  /** Overall scale multiplier, used by scroll choreography. */
  scale: number
}

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uCenter;
uniform vec2 uLook;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform float uSize;
uniform float uWobble;
uniform float uGlow;
uniform float uBlink;
uniform float uBreath;
uniform float uSquish;
uniform float uShy;
uniform float uEyes;
uniform float uLobes;
uniform float uSeed;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

float shape(vec2 p, float t) {
  p.x /= 1.0 + uSquish * 0.2;
  p.y /= 1.0 - uSquish * 0.16;
  float a = atan(p.y, p.x);
  float r = length(p);
  vec2 c = vec2(cos(a), sin(a));
  float n = fbm(c * 1.35 + vec2(t * 0.33 + uSeed * 17.0, -t * 0.26 + uSeed * 9.0));
  float lobes = sin(a * uLobes + t * 0.7 + uSeed * 6.283) * 0.5
              + sin(a * (uLobes + 1.0) - t * 0.55) * 0.22;
  float rad = uSize * (1.0 + uBreath * 0.05);
  rad += uSize * uWobble * ((n - 0.5) * 0.6 + lobes * 0.1);
  // A slightly flatter underside, so it reads as sitting rather than floating.
  rad *= 1.0 - 0.07 * smoothstep(0.0, -1.0, c.y);
  return r - rad;
}

void main() {
  float m = min(uRes.x, uRes.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / m;
  vec2 p = uv - uCenter;
  float t = uTime;
  float aa = 1.6 / m;

  float d = shape(p, t);
  float body = 1.0 - smoothstep(-aa, aa, d);
  float depth = clamp(-d / uSize, 0.0, 1.0);

  // Body colour: lit from the upper left, with a slow subsurface swirl.
  vec2 lightPos = vec2(-0.35, 0.45) * uSize + uLook * 0.04;
  float l = 1.0 - clamp(length(p - lightPos) / (uSize * 2.1), 0.0, 1.0);
  float swirl = fbm(p * 5.0 / max(uSize, 0.05) * 0.3 + vec2(t * 0.12, -t * 0.18));
  vec3 col = mix(uColB, uColA, smoothstep(0.05, 0.95, l * 0.85 + depth * 0.3 + swirl * 0.22));

  // Rim light, strongest on top.
  float rim = exp(-(-d) / (uSize * 0.07)) * body;
  col += uColC * rim * 0.45 * (0.55 + 0.45 * smoothstep(-0.6, 0.8, p.y / uSize));

  // Specular highlight.
  vec2 hp = p - (vec2(-0.34, 0.44) * uSize + uLook * 0.015);
  hp *= vec2(1.0, 1.7);
  float spec = exp(-dot(hp, hp) / (uSize * uSize * 0.01));
  col += vec3(1.0, 1.0, 0.95) * spec * 0.45;

  col *= 0.68 + 0.42 * uGlow;

  // Cheeks: a faint warm blush that deepens when it is shy.
  float eyeSep = uSize * (0.2 + uEyes * 0.2);
  vec2 eyeC = vec2(0.0, uSize * 0.07) + uLook * uSize * vec2(0.24, 0.15);
  vec2 ch1 = (p - (eyeC + vec2(-eyeSep * 0.82, -uSize * 0.16))) / (uSize * 0.11);
  vec2 ch2 = (p - (eyeC + vec2( eyeSep * 0.82, -uSize * 0.16))) / (uSize * 0.11);
  float cheeks = exp(-dot(ch1, ch1)) + exp(-dot(ch2, ch2));
  col = mix(col, vec3(1.0, 0.48, 0.42), cheeks * (0.12 + 0.4 * uShy) * body);

  // Eyes.
  float openness = max((1.0 - uBlink) * (1.0 - uShy * 0.72), 0.07);
  float er = uSize * 0.072;
  vec2 e1 = (p - (eyeC + vec2(-eyeSep * 0.5, 0.0))) / vec2(er, er * 1.5 * openness);
  vec2 e2 = (p - (eyeC + vec2( eyeSep * 0.5, 0.0))) / vec2(er, er * 1.5 * openness);
  float ed = min(length(e1), length(e2));
  float eyeAA = aa / (er * openness) * 1.4;
  float eyes = (1.0 - smoothstep(1.0 - eyeAA, 1.0 + eyeAA, ed)) * body;
  vec3 eyeCol = uColB * 0.12 + vec3(0.02, 0.015, 0.03);
  col = mix(col, eyeCol, eyes);
  // Catch-lights.
  vec2 g1 = (p - (eyeC + vec2(-eyeSep * 0.5 + er * 0.35, er * 0.55 * openness))) / (er * 0.32);
  vec2 g2 = (p - (eyeC + vec2( eyeSep * 0.5 + er * 0.35, er * 0.55 * openness))) / (er * 0.32);
  float glint = (1.0 - smoothstep(0.7, 1.0, min(length(g1), length(g2)))) * eyes * smoothstep(0.35, 0.7, openness);
  col = mix(col, vec3(1.0), glint * 0.9);

  // Halo.
  float outside = max(d, 0.0);
  float halo = exp(-outside / (uSize * (0.28 + 0.25 * uGlow))) * (0.18 + 0.55 * uGlow);
  halo += exp(-outside / (uSize * 1.4)) * 0.08 * uGlow;

  // Spores: a handful of slow motes orbiting the body.
  float spores = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float h1 = hash(vec2(fi, uSeed * 31.0 + 1.0));
    float h2 = hash(vec2(fi * 2.7, uSeed * 13.0 + 4.0));
    float ang = h1 * 6.2831 + t * (0.05 + h2 * 0.1) * (mod(fi, 2.0) * 2.0 - 1.0);
    float rad = uSize * (1.35 + h2 * 0.9) + sin(t * 0.4 + fi) * uSize * 0.08;
    vec2 sp = vec2(cos(ang), sin(ang)) * rad;
    sp.y += sin(t * 0.3 + fi * 1.7) * uSize * 0.15;
    float sd = length(p - sp) / (uSize * (0.012 + 0.012 * h1));
    float tw = 0.5 + 0.5 * sin(t * (0.6 + h1) + fi * 3.1);
    spores += exp(-sd * sd) * (0.35 + 0.65 * tw);
  }
  spores *= 0.25 + 0.75 * uGlow;

  // Fade the halo out before the canvas edge so no rectangle ever shows.
  vec2 q = gl_FragCoord.xy / uRes;
  float edge = smoothstep(0.0, 0.18, q.x) * smoothstep(1.0, 0.82, q.x)
             * smoothstep(0.0, 0.18, q.y) * smoothstep(1.0, 0.82, q.y);
  float haloA = clamp(halo + spores, 0.0, 1.0) * (1.0 - body) * edge;
  vec3 haloCol = mix(uColA, uColC, 0.35);
  vec3 rgb = col * body + haloCol * haloA;
  float alpha = body + haloA;
  gl_FragColor = vec4(rgb, alpha);
}
`

const UNIFORMS = [
  'uRes', 'uTime', 'uCenter', 'uLook', 'uColA', 'uColB', 'uColC', 'uSize', 'uWobble',
  'uGlow', 'uBlink', 'uBreath', 'uSquish', 'uShy', 'uEyes', 'uLobes', 'uSeed',
] as const

type UniformName = (typeof UNIFORMS)[number]

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [r + m, g + m, b + m]
}

/** The three body colours derived from a single hue. */
export function palette(hue: number) {
  return {
    a: hslToRgb(hue, 0.88, 0.7),
    b: hslToRgb(hue + 34, 0.62, 0.26),
    c: hslToRgb(hue - 22, 1, 0.88),
  }
}

export function cssColor(hue: number, l = 0.7, s = 0.88) {
  const [r, g, b] = hslToRgb(hue, s, l)
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`
}

export class CreatureGL {
  readonly canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private buffer: WebGLBuffer
  private loc: Record<UniformName, WebGLUniformLocation | null>
  private width = 0
  private height = 0

  constructor(canvas: HTMLCanvasElement, opts: { preserve?: boolean } = {}) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: !!opts.preserve,
      powerPreference: 'low-power',
    })
    if (!gl) throw new Error('WebGL unavailable')
    this.gl = gl

    const vs = this.compile(gl.VERTEX_SHADER, VERT)
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()
    if (!program) throw new Error('Could not create program')
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Link failed')
    }
    this.program = program
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    if (!buffer) throw new Error('Could not create buffer')
    this.buffer = buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    this.loc = Object.fromEntries(
      UNIFORMS.map((n) => [n, gl.getUniformLocation(program, n)]),
    ) as Record<UniformName, WebGLUniformLocation | null>
  }

  private compile(type: number, src: string) {
    const gl = this.gl
    const sh = gl.createShader(type)
    if (!sh) throw new Error('Could not create shader')
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) ?? 'Compile failed')
    }
    return sh
  }

  resize(cssW: number, cssH: number, dpr: number) {
    const w = Math.max(1, Math.round(cssW * dpr))
    const h = Math.max(1, Math.round(cssH * dpr))
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h
    this.canvas.width = w
    this.canvas.height = h
    this.gl.viewport(0, 0, w, h)
  }

  draw(params: CreatureParams, f: FrameState) {
    const { gl, loc } = this
    const pal = palette(params.hue)
    gl.uniform2f(loc.uRes, this.width, this.height)
    gl.uniform1f(loc.uTime, f.time)
    gl.uniform2f(loc.uCenter, f.center[0], f.center[1])
    gl.uniform2f(loc.uLook, f.look[0], f.look[1])
    gl.uniform3f(loc.uColA, ...pal.a)
    gl.uniform3f(loc.uColB, ...pal.b)
    gl.uniform3f(loc.uColC, ...pal.c)
    gl.uniform1f(loc.uSize, params.size * f.scale)
    gl.uniform1f(loc.uWobble, params.wobble)
    gl.uniform1f(loc.uGlow, f.glow)
    gl.uniform1f(loc.uBlink, f.blink)
    gl.uniform1f(loc.uBreath, f.breath)
    gl.uniform1f(loc.uSquish, f.squish)
    gl.uniform1f(loc.uShy, f.shy)
    gl.uniform1f(loc.uEyes, params.eyes)
    gl.uniform1f(loc.uLobes, Math.round(params.lobes))
    gl.uniform1f(loc.uSeed, params.seed)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  dispose() {
    const { gl } = this
    gl.deleteBuffer(this.buffer)
    gl.deleteProgram(this.program)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

export function restingFrame(params: CreatureParams, time = 4.2): FrameState {
  return {
    time,
    center: [0, 0],
    look: [0.15, 0.1],
    blink: 0,
    breath: 0.2,
    squish: 0,
    shy: 0,
    glow: params.glow,
    scale: 1,
  }
}

let shared: CreatureGL | null = null
let sharedFailed = false

/**
 * Renders a still portrait of a creature to a PNG data URL using one shared,
 * offscreen WebGL context. Returns null if WebGL is unavailable.
 */
export function renderPortrait(params: CreatureParams, size = 640, time = 4.2): string | null {
  if (sharedFailed) return null
  try {
    if (!shared) shared = new CreatureGL(document.createElement('canvas'), { preserve: true })
  } catch {
    sharedFailed = true
    return null
  }
  shared.resize(size, size, 1)
  shared.draw(params, restingFrame(params, time))
  return shared.canvas.toDataURL('image/png')
}
