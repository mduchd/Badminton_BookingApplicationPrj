import { useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '329281674145-bbkiipcmkff46lqraifh7fcatsg225vv.apps.googleusercontent.com'

type GoogleIdentity = {
  accounts: { id: {
    initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
    renderButton: (element: HTMLElement, options: Record<string, string | number>) => void
  } }
}
declare global { interface Window { google?: GoogleIdentity } }

export function GoogleSignInButton({ onCredential, disabled }: { onCredential: (credential: string) => void; disabled: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  const callback = useRef(onCredential)
  const [compact, setCompact] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => { callback.current = onCredential }, [onCredential])

  useEffect(() => {
    let active = true
    const render = () => {
      if (!active || !window.google || !container.current) return
      const width = container.current.parentElement?.clientWidth || 240
      const isCompact = width < 320
      setCompact(isCompact)
      container.current.replaceChildren()
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (result) => callback.current(result.credential) })
      window.google.accounts.id.renderButton(container.current, { type: isCompact ? 'icon' : 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: Math.min(360, width), locale: 'vi' })
    }
    const observer = new ResizeObserver(render)
    if (container.current?.parentElement) observer.observe(container.current.parentElement)
    if (window.google) { render(); return () => { active = false; observer.disconnect() } }
    let script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      document.head.appendChild(script)
    }
    const failed = () => { if (active) setError(true) }
    script.addEventListener('load', render)
    script.addEventListener('error', failed)
    return () => { active = false; observer.disconnect(); script?.removeEventListener('load', render); script?.removeEventListener('error', failed) }
  }, [])

  return <div aria-disabled={disabled} className={`flex flex-wrap items-center justify-center gap-2 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
    <div ref={container} />
    {compact && <span className="text-sm font-medium text-slate-700">Tiếp tục với Google</span>}
    {error && <p role="alert">Không tải được đăng nhập Google. Vui lòng thử lại.</p>}
  </div>
}
