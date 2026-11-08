import React from 'react'

interface TabSkeletonProps {
  variant?: 'court-cards' | 'table' | 'khampha'
  count?: number
}

export const TabSkeleton: React.FC<TabSkeletonProps> = ({
  variant = 'court-cards',
  count = 6,
}) => {
  if (variant === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
              <th className="py-2.5 px-3 font-semibold">Mã đơn</th>
              <th className="py-2.5 px-3 font-semibold">Sân đấu</th>
              <th className="py-2.5 px-3 font-semibold">Ngày chơi</th>
              <th className="py-2.5 px-3 font-semibold">Khung giờ</th>
              <th className="py-2.5 px-3 font-semibold">Tổng tiền</th>
              <th className="py-2.5 px-3 font-semibold">Trạng thái</th>
              <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, idx) => (
              <tr key={idx} className="bg-white">
                <td className="py-3 px-3">
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                </td>
                <td className="py-3 px-3">
                  <div className="h-4 w-32 bg-slate-100 rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </td>
                <td className="py-3 px-3">
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                </td>
                <td className="py-3 px-3">
                  <div className="h-4 w-20 bg-slate-100 rounded" />
                </td>
                <td className="py-3 px-3">
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                </td>
                <td className="py-3 px-3">
                  <div className="h-6 w-24 bg-slate-100 rounded-lg" />
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="h-7 w-16 bg-slate-100 rounded-lg ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (variant === 'khampha') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl border border-slate-200/90 bg-white flex flex-col justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-8 w-20 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Default: court-cards
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden flex flex-col"
        >
          {/* Ảnh thumbnail */}
          <div className="h-44 sm:h-48 bg-slate-100 w-full" />
          {/* Thông tin */}
          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="h-5 w-4/5 bg-slate-100 rounded" />
              <div className="h-3.5 w-3/5 bg-slate-100 rounded" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="h-5 w-24 bg-slate-100 rounded" />
              <div className="h-8 w-20 bg-slate-100 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TabSkeleton
