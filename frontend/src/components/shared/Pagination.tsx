interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-4 p-4 text-sm">
      <button type="button" disabled={page <= 0} onClick={() => onChange(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40 cursor-pointer">Trước</button>
      <span aria-live="polite">Trang {page + 1} / {pages}</span>
      <button type="button" disabled={page >= pages - 1} onClick={() => onChange(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40 cursor-pointer">Tiếp</button>
    </nav>
  )
}
