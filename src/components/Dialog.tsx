import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = ref.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className="dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
    {children}
  </dialog>
}
