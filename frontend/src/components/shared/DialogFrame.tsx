import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const openDialogs: HTMLElement[] = []
let originalOverflow = ''

/** Shared keyboard and focus lifecycle; visual layout stays with the caller. */
export function DialogFrame({ children, className, onClose, label }: {
  children: ReactNode
  className: string
  onClose: () => void
  label: string
}) {
  const frame = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    const element = frame.current!
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (openDialogs.length === 0) originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    openDialogs.push(element)
    const controls = () => Array.from(element.querySelectorAll<HTMLElement>(
      'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
    )).filter(control => control.getClientRects().length > 0 && !control.closest('[inert]'))
    const initial = requestAnimationFrame(() => (controls()[0] ?? element).focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (openDialogs.at(-1) !== element) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); return }
      if (event.key !== 'Tab') return
      const items = controls()
      const first = items[0]
      const last = items.at(-1)
      if (!first) { event.preventDefault(); element.focus(); return }
      if (!element.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault(); (event.shiftKey ? last! : first).focus()
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      cancelAnimationFrame(initial)
      document.removeEventListener('keydown', onKeyDown, true)
      openDialogs.splice(openDialogs.indexOf(element), 1)
      if (openDialogs.length === 0) document.body.style.overflow = originalOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return createPortal(<div ref={frame} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={className}>{children}</div>, document.body)
}
