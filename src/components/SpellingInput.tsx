import { useEffect, useRef, type FormEvent } from 'react'
import type { Session } from '../data/types'

export function SpellingInput({ session, onInput, onSubmit }: { session: Session; onInput: (value: string) => void; onSubmit: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const done = session.flags.spell.done
  useEffect(() => { if (session.heard && !done && !session.hintOpen) input.current?.focus() }, [session.heard, session.hintOpen, done])
  useEffect(() => {
    if (session.feedback === 'retry') input.current?.select()
  }, [session.feedback])
  useEffect(() => {
    const reveal = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      if (window.innerWidth <= 700 && viewportHeight < 550 && document.activeElement === input.current) {
        const element = input.current!
        const top = element.getBoundingClientRect().top + window.scrollY - (window.visualViewport?.offsetTop ?? 0)
        window.scrollTo({ top: Math.max(0, top - viewportHeight / 2 + element.offsetHeight / 2), behavior: 'instant' })
      }
    }
    reveal()
    window.visualViewport?.addEventListener('resize', reveal)
    window.addEventListener('resize', reveal)
    return () => { window.visualViewport?.removeEventListener('resize', reveal); window.removeEventListener('resize', reveal) }
  }, [session.feedback, session.heard, session.hintOpen])
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }
  return <form className="spelling-area" onSubmit={submit}>
    <label className="sr-only" htmlFor="spelling">Type the word you hear</label>
    <input ref={input} id="spelling" className="spelling-input" aria-invalid={session.feedback === 'retry' || session.feedback === 'letters'} value={session.input}
      onChange={event => onInput(event.currentTarget.value)} readOnly={!session.heard || done} maxLength={64}
      autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} inputMode="text" lang="en" enterKeyHint="done"/>
  </form>
}
