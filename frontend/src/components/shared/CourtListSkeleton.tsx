export function CourtListSkeleton() {
  return (
    <div role="status" aria-label="Đang tải danh sách sân" className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Đang tải danh sách sân</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} aria-hidden="true" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="h-44 bg-slate-200 sm:h-48" />
          <div className="flex items-center gap-3 p-3.5">
            <div className="h-12 w-12 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-slate-200" /><div className="h-3 w-4/5 rounded bg-slate-100" /></div>
          </div>
        </div>
      ))}
    </div>
  )
}
