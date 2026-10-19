import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'

export function Dialog({ title, children, onClose, initialFocusRef, returnFocusRef }: { title: string; children: ReactNode; onClose: () => void; initialFocusRef?: RefObject<HTMLElement | null>; returnFocusRef?: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const element = ref.current!
    const previous = document.activeElement as HTMLElement | null
    const initialTarget = initialFocusRef?.current
    const explicitReturnTarget = returnFocusRef?.current
    const returnTarget = explicitReturnTarget ?? previous
    element.showModal()
    initialTarget?.focus()
    return () => {
      element.close()
      if (returnTarget?.isConnected) returnTarget.focus()
      if (explicitReturnTarget) window.requestAnimationFrame(() => {
        if (explicitReturnTarget.isConnected) explicitReturnTarget.focus()
      })
    }
  }, [initialFocusRef, returnFocusRef])
  return <dialog ref={ref} className="dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
    {children}
  </dialog>
}
