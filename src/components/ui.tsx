import {
  createElement,
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ElementType,
  type ReactNode,
} from 'react'
import { finePointer, gsap, prefersReducedMotion, scrollToId } from '../lib/motion'

/** Gentle magnetic pull toward the pointer, desktop + full motion only. */
function useMagnet<T extends HTMLElement>(strength = 0.25) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !finePointer() || prefersReducedMotion()) return
    const inner = el.querySelector<HTMLElement>('.btn__inner')
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.5)' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.5)' })
    const ixTo = inner && gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'power3.out' })
    const iyTo = inner && gsap.quickTo(inner, 'y', { duration: 0.6, ease: 'power3.out' })
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      xTo(dx * strength)
      yTo(dy * strength)
      ixTo?.(dx * strength * 0.4)
      iyTo?.(dy * strength * 0.4)
    }
    const leave = () => {
      xTo(0)
      yTo(0)
      ixTo?.(0)
      iyTo?.(0)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [strength])
  return ref
}

type Common = {
  children: ReactNode
  variant?: 'solid' | 'ghost' | 'line'
  icon?: ReactNode
  size?: 'md' | 'lg'
  className?: string
}

function Label({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="btn__inner">
      <span className="btn__roll" data-text={typeof children === 'string' ? children : undefined}>
        <span>{children}</span>
      </span>
      {icon && <span className="btn__icon" aria-hidden="true">{icon}</span>}
    </span>
  )
}

export function Button({ children, variant = 'solid', icon, size = 'md', className = '', ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useMagnet<HTMLButtonElement>()
  return (
    <button ref={ref} type="button" className={`btn btn--${variant} btn--${size} ${className}`} {...rest}>
      <Label icon={icon}>{children}</Label>
    </button>
  )
}

/** In-page anchor that scrolls smoothly and keeps a real href. */
export function LinkButton({ children, variant = 'solid', icon, size = 'md', className = '', href = '#', onClick, ...rest }: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const ref = useMagnet<HTMLAnchorElement>()
  return (
    <a
      ref={ref}
      href={href}
      className={`btn btn--${variant} btn--${size} ${className}`}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented && href.startsWith('#') && href.length > 1) {
          e.preventDefault()
          scrollToId(href.slice(1))
        }
      }}
      {...rest}
    >
      <Label icon={icon}>{children}</Label>
    </a>
  )
}

/**
 * Splits text into words that rise out of a mask when scrolled into view.
 * Screen readers get the plain sentence via aria-label.
 */
export function WordReveal({
  text,
  as = 'h2',
  className = '',
  delay = 0,
  stagger = 0.045,
  start = 'top 85%',
  play,
}: {
  text: string
  as?: ElementType
  className?: string
  delay?: number
  stagger?: number
  start?: string
  /** If provided, plays when this becomes true instead of on scroll. */
  play?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const lines = text.split('\n')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const words = el.querySelectorAll<HTMLElement>('.wr__w > span')
    if (prefersReducedMotion()) {
      gsap.set(words, { yPercent: 0, opacity: 1 })
      return
    }
    gsap.set(words, { yPercent: 115, rotate: 4 })
    if (play === undefined) {
      const tween = gsap.to(words, {
        yPercent: 0,
        rotate: 0,
        duration: 1.1,
        ease: 'expo.out',
        stagger,
        delay,
        scrollTrigger: { trigger: el, start, once: true },
      })
      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
      }
    }
    if (play) {
      const tween = gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.2, ease: 'expo.out', stagger, delay })
      return () => {
        tween.kill()
      }
    }
  }, [play, delay, stagger, start])

  return createElement(
    as,
    { ref, className: `wr ${className}`, 'aria-label': text.replace(/\n/g, ' ') },
    lines.map((line, li) => (
      <span className="wr__line" key={li} aria-hidden="true">
        {line.split(' ').map((w, wi) => {
          const em = w.startsWith('_') && w.endsWith('_')
          const word = em ? w.slice(1, -1) : w
          return (
            <span className={`wr__w${em ? ' wr__w--em' : ''}`} key={wi}>
              <span>{word}</span>
            </span>
          )
        })}
      </span>
    )),
  )
}

/** Mono eyebrow label with an index number. */
export function Eyebrow({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <p className="eyebrow" data-reveal>
      {index && <span className="eyebrow__i">{index}</span>}
      <span>{children}</span>
    </p>
  )
}
