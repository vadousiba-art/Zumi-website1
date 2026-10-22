import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_PARAMS, type CreatureParams } from './creature'
import { audio } from './audio'
import { decodeCreature } from './seed'

type LabState = { name: string; params: CreatureParams }

type Store = {
  introDone: boolean
  finishIntro: () => void
  sound: boolean
  toggleSound: () => void
  lab: LabState
  setLab: (next: LabState | ((prev: LabState) => LabState)) => void
  sessionOpen: boolean
  sessionMinutes: number
  openSession: (minutes?: number) => void
  closeSession: () => void
}

const Ctx = createContext<Store | null>(null)

function initialLab(): LabState {
  if (typeof window !== 'undefined') {
    const m = window.location.hash.match(/^#lab\/(.+)$/)
    if (m) {
      const decoded = decodeCreature(m[1])
      if (decoded) return decoded
    }
  }
  return { name: '', params: { ...DEFAULT_PARAMS } }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [introDone, setIntroDone] = useState(false)
  const [sound, setSound] = useState(false)
  const [lab, setLab] = useState<LabState>(initialLab)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [sessionMinutes, setSessionMinutes] = useState(25)

  const toggleSound = useCallback(() => {
    setSound((s) => {
      void audio.setEnabled(!s)
      return !s
    })
  }, [])

  const finishIntro = useCallback(() => setIntroDone(true), [])
  const closeSession = useCallback(() => setSessionOpen(false), [])

  const openSession = useCallback((minutes?: number) => {
    if (minutes) setSessionMinutes(minutes)
    setSessionOpen(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('is-locked', sessionOpen)
  }, [sessionOpen])

  const value = useMemo<Store>(
    () => ({
      introDone,
      finishIntro,
      sound,
      toggleSound,
      lab,
      setLab,
      sessionOpen,
      sessionMinutes,
      openSession,
      closeSession,
    }),
    [introDone, finishIntro, sound, toggleSound, lab, sessionOpen, sessionMinutes, openSession, closeSession],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}
