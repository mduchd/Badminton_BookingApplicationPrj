import type { ButtonHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; busy?: boolean }
const variants = {
  primary: 'bg-[#1b7a42] text-white hover:bg-[#156335]',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
}
export function Button({ variant = 'primary', busy = false, disabled, className, children, type = 'button', ...props }: Props) {
  return <button {...props} type={type} disabled={disabled || busy} aria-busy={busy || undefined}
    className={twMerge('inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b7a42] disabled:opacity-60 disabled:cursor-not-allowed', variants[variant], className)}>
    {children}
  </button>
}
