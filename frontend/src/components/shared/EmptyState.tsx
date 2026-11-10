import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    {description && <p className="max-w-md text-sm leading-relaxed text-slate-600">{description}</p>}
    {action}
  </div>
}
