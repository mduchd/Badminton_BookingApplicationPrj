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
  const [error, setError] = useState(false)
  callback.current = onCredential

  useEffect(() => {
    let active = true
    const render = () => {
      if (!active || !window.google || !container.current) return
      container.current.replaceChildren()
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (result) => callback.current(result.credential) })
      window.google.accounts.id.renderButton(container.current, { theme: 'outline', size: 'large', text: 'continue_with', width: 360, locale: 'vi' })
    }
    if (window.google) { render(); return () => { active = false } }
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
    return () => { active = false; script?.removeEventListener('load', render); script?.removeEventListener('error', failed) }
  }, [])

  return <div aria-disabled={disabled} className={disabled ? 'pointer-events-none opacity-50' : ''}>
    <div ref={container} />
    {error && <p role="alert">Không tải được đăng nhập Google. Vui lòng thử lại.</p>}
  </div>
}
