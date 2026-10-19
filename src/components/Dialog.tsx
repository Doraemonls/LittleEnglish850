import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'

export function Dialog({ title, children, onClose, initialFocusRef, returnFocusRef }: { title: string; children: ReactNode; onClose: () => void; initialFocusRef?: RefObject<HTMLElement | null>; returnFocusRef?: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const element = ref.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    initialFocusRef?.current?.focus()
    return () => {
      element.close()
      window.requestAnimationFrame(() => {
        const target = returnFocusRef?.current ?? previous
        if (target?.isConnected) target.focus()
      })
    }
  }, [initialFocusRef, returnFocusRef])
  return <dialog ref={ref} className="dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
    {children}
  </dialog>
}
