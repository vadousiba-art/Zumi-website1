import { useEffect } from 'react'
import { StoreProvider } from './lib/store'
import { ScrollTrigger, gsap, prefersReducedMotion } from './lib/motion'
import { Intro } from './components/Intro'
import { Nav } from './components/Nav'
import { Session } from './components/Session'
import { Hero } from './sections/Hero'
import { Manifesto } from './sections/Manifesto'
import { Ritual } from './sections/Ritual'
import { Breathe } from './sections/Breathe'
import { Lab } from './sections/Lab'
import { Specimens } from './sections/Specimens'
import { Promises } from './sections/Promises'
import { Closing, Footer } from './sections/Closing'

/** Generic fade-up for anything marked data-reveal. */
function useRevealBatch() {
  useEffect(() => {
    const els = gsap.utils.toArray<HTMLElement>('[data-reveal]')
    if (prefersReducedMotion()) return
    gsap.set(els, { opacity: 0, y: 28 })
    const triggers = ScrollTrigger.batch(els, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
    })
    const refresh = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refresh)
    window.addEventListener('load', refresh)
    return () => {
      triggers.forEach((t) => t.kill())
      gsap.set(els, { clearProps: 'opacity,transform' })
      window.removeEventListener('load', refresh)
    }
  }, [])
}

function Page() {
  useRevealBatch()

  // Land on a deep link (e.g. a shared #lab/… creature) after layout settles.
  useEffect(() => {
    const id = location.hash.slice(1).split('/')[0]
    if (!id || id === 'top') return
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 120)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <>
      <Intro />
      <Nav />
      <main id="main">
        <Hero />
        <Manifesto />
        <Ritual />
        <Breathe />
        <Lab />
        <Specimens />
        <Promises />
        <Closing />
      </main>
      <Footer />
      <Session />
      <div className="grain" aria-hidden="true" />
    </>
  )
}

export function App() {
  return (
    <StoreProvider>
      <Page />
    </StoreProvider>
  )
}
