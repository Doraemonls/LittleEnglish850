import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '../data/types'
import type { SpellEdit } from '../domain/session'

export function SpellingInput({ answer, session, onEdit }: { answer: string; session: Session; onEdit: (edit: SpellEdit) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [composition, setComposition] = useState<string | null>(null)
  const composing = useRef(false)
  const justComposed = useRef(false)
  const done = session.flags.spell.done
  useEffect(() => { if (session.heard && !done && !session.hintOpen) input.current?.focus() }, [session.heard, session.hintOpen, done])
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
  const edit = (action: SpellEdit) => {
    onEdit(action)
    // The native input is never replaced; mobile keyboards stay open after errors.
    input.current?.focus()
  }
  const process = (value: string, type: string) => {
    if (type === 'deleteContentBackward' && value === session.input.slice(0, -1)) { edit({ kind: 'delete' }); return }
    if (type === 'insertText' && value.length === session.input.length + 1 && value.slice(0, -1) === session.input) { edit({ kind: 'insert', value: value.slice(-1) }); return }
    edit({ kind: 'reject' })
  }
  const onInput = (event: FormEvent<HTMLInputElement>) => {
    const element = event.currentTarget
    const native = event.nativeEvent as InputEvent
    if (composing.current) { setComposition(element.value); return }
    if (justComposed.current) { justComposed.current = false; element.value = session.input; return }
    process(element.value, native.inputType)
    element.value = session.input
  }
  let letterIndex = 0
  return <div className="spelling-area">
    <div className="letter-slots" aria-hidden="true">{[...answer].map((char, index) => {
      if (!/[a-z]/i.test(char)) return <span className="separator" key={index}>{char}</span>
      const letter = session.input[letterIndex++]
      return <span key={index} className={`letter-slot ${letter ? 'filled' : ''}`}>{letter || ''}</span>
    })}</div>
    <label className="sr-only" htmlFor="spelling">输入你听到的单词</label>
    <input ref={input} id="spelling" className="spelling-input" value={composition ?? session.input} onChange={() => {}} onInput={onInput}
      onBeforeInput={event => {
        const native = event.nativeEvent as InputEvent
        if (!composing.current && ['insertFromPaste', 'insertFromDrop', 'insertReplacementText'].includes(native.inputType)) { event.preventDefault(); edit({ kind: 'reject' }) }
      }}
      onPaste={event => { event.preventDefault(); edit({ kind: 'reject' }) }}
      onDrop={event => { event.preventDefault(); edit({ kind: 'reject' }) }}
      onCompositionStart={() => { composing.current = true; setComposition(session.input) }}
      onCompositionEnd={event => {
        composing.current = false; setComposition(null)
        justComposed.current = true
        window.setTimeout(() => { justComposed.current = false }, 0)
        const value = event.data
        if (/^[a-z]$/i.test(value)) edit({ kind: 'insert', value }); else edit({ kind: 'reject' })
      }}
      onKeyDown={event => { if (event.key === 'Enter') event.preventDefault() }}
      readOnly={!session.heard || done} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} inputMode="text" lang="en" enterKeyHint="done"/>
  </div>
}
