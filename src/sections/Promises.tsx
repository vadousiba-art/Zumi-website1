import { useEffect, useRef } from 'react'
import { Eyebrow } from '../components/ui'
import { gsap, prefersReducedMotion } from '../lib/motion'

const NEVER = [
  ['Send you a notification.', 'It can’t. It doesn’t ask for permission to.'],
  ['Count your streak.', 'Yesterday doesn’t matter. Neither does tomorrow.'],
  ['Ask for your email.', 'There is no account to make.'],
  ['Phone home with your data.', 'No analytics, no cookies, no server to send it to.'],
  ['Make you feel bad for leaving.', 'Close the tab whenever you like. It won’t mind.'],
]

export function Promises() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      const rows = gsap.utils.toArray<HTMLElement>('.promise')
      if (prefersReducedMotion()) {
        gsap.set('.promise__strike path', { strokeDashoffset: 0 })
        return
      }
      rows.forEach((row) => {
        const path = row.querySelector('.promise__strike path')
        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 78%', once: true } })
        tl.from(row.querySelector('.promise__text'), { yPercent: 100, duration: 1, ease: 'expo.out' })
          .from(row.querySelectorAll('.promise__num, .promise__why'), { opacity: 0, y: 12, duration: 0.8, ease: 'expo.out', stagger: 0.08 }, '<0.1')
          .to(path, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.4')
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="promises section" id="promises" ref={ref} aria-labelledby="promises-title">
      <div className="promises__head">
        <Eyebrow index="06">Promises</Eyebrow>
        <h2 id="promises-title" className="display display--m" data-reveal>
          Things Zommie will <em>never</em> do.
        </h2>
      </div>
      <ol className="promises__list">
        {NEVER.map(([what, why], i) => (
          <li className="promise" key={what}>
            <span className="promise__num mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="promise__mask">
              <span className="promise__text">
                <s>{what}</s>
                <svg className="promise__strike" viewBox="0 0 400 20" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 12 C 60 6, 120 15, 200 10 S 340 6, 398 11" pathLength={1} />
                </svg>
              </span>
            </span>
            <span className="promise__why">{why}</span>
          </li>
        ))}
      </ol>
      <p className="promises__note" data-reveal>
        <span className="mono">Fine print, honestly:</span> this page is static files and code that runs in your
        browser. The only things it remembers are whether you’ve already seen the intro this visit, and any link you
        choose to copy.
      </p>
    </section>
  )
}
