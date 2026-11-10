import { useId, type InputHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }
export function FormField({ label, hint, error, id, className, ...props }: Props) {
  const generatedId = useId()
  const fieldId = id || generatedId
  return <div className="space-y-1.5">
    <label htmlFor={fieldId} className="block text-sm font-semibold text-slate-800">{label}</label>
    <input {...props} id={fieldId} aria-invalid={!!error || undefined} aria-describedby={error || hint ? `${fieldId}-description` : undefined}
      className={twMerge('w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:outline-[#1b7a42] disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed', className)} />
    {(error || hint) && <p id={`${fieldId}-description`} role={error ? 'alert' : undefined} className={`text-sm ${error ? 'text-rose-700' : 'text-slate-600'}`}>{error || hint}</p>}
  </div>
}
