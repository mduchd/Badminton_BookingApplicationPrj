import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router'
import { courtApi } from '../../court/services/courtApi'

interface CourtBookingGridViewProps {
  onBook: (court: {
    courtId: number
    courtName: string
    facilityName: string
    facilityAddress?: string
  }) => void
}

export function CourtBookingGridView({ onBook }: CourtBookingGridViewProps) {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isPending, isError } = useQuery({
    queryKey: ['facilityBooking', id],
    queryFn: () => courtApi.getFacilityDetail(id),
    retry: false,
  })

  if (isPending) {
    return <p className="p-6 text-center text-slate-600">Đang tải danh sách sân…</p>
  }

  if (isError) {
    return (
      <div className="space-y-3 p-6 text-center">
        <p role="alert">Không thể tải thông tin cụm sân.</p>
        <Link to={ROUTES.HOME} className="text-green-700 underline">Về trang chủ</Link>
      </div>
    )
  }

  const { facility } = data
  const bookableCourts = /^\d+$/.test(facility.id) && facility.status === 'active'
    ? facility.subCourts.filter((court) => {
        const courtId = Number(court.id)
        return court.status === 'active' && Number.isSafeInteger(courtId) && courtId > 0
      })
    : []

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <Link to={`/courts/${facility.id}`} className="text-sm font-semibold text-green-700">
        ← Về chi tiết cụm sân
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{facility.name}</h1>
        <p className="text-sm text-slate-600">{facility.normalizedAddress || facility.address}</p>
      </header>

      <section className="space-y-3" aria-labelledby="choose-court">
        <h2 id="choose-court" className="text-lg font-semibold text-slate-900">Chọn sân để xem giờ trống</h2>
        {bookableCourts.length === 0 ? (
          <p className="text-sm text-slate-600">Cụm sân này hiện chưa có sân nhận đặt trực tuyến.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {bookableCourts.map((court) => (
              <li key={court.id}>
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 text-left font-semibold text-slate-900 hover:border-green-700 focus-visible:outline-2 focus-visible:outline-green-700"
                  onClick={() => onBook({
                    courtId: Number(court.id),
                    courtName: court.name,
                    facilityName: facility.name,
                    facilityAddress: facility.normalizedAddress || facility.address,
                  })}
                >
                  {court.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
