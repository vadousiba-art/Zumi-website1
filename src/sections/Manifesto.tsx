import { useEffect, useRef } from 'react'
import { Eyebrow } from '../components/ui'
import { gsap, prefersReducedMotion } from '../lib/motion'

const TEXT =
  'Most things on your screen want something from you. Your attention, your streak, your next tap. Zommie wants _nothing._ It doesn’t send notifications, keep score, or know your name. It just sits here, breathing about _six_ _times_ _a_ _minute_ — and if you let it, you’ll start breathing with it.'

export function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('.mf__w'),
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="manifesto section" id="about" aria-labelledby="about-title">
      <div className="manifesto__head">
        <Eyebrow index="01">What it is</Eyebrow>
        <h2 id="about-title" className="sr-only">What Zommie is</h2>
      </div>
      <p className="manifesto__text" ref={ref}>
        {TEXT.split(' ').map((w, i) => {
          const em = w.startsWith('_')
          const clean = w.replace(/_/g, '')
          return (
            <span key={i} className={`mf__w${em ? ' mf__w--em' : ''}`}>
              {clean}{' '}
            </span>
          )
        })}
      </p>
      <div className="manifesto__foot" data-reveal>
        <p>
          Six breaths a minute is a slow, steady pace that many breathing practices use for winding down.
          Zommie keeps it for you, so you don’t have to count.
        </p>
        <p className="mono dim">5.5 breaths / min · 10.9 s per cycle</p>
      </div>
    </section>
  )
}
