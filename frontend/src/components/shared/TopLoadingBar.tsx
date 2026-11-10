import { useIsFetching } from '@tanstack/react-query'

export const TopLoadingBar = () => {
  const isFetching = useIsFetching()
  if (!isFetching) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-emerald-100 pointer-events-none"
      role="progressbar" aria-label="Đang tải dữ liệu" aria-valuetext="Đang tải">
      <div className="h-full w-1/2 bg-[#1b7a42]" />
    </div>
  )
}

export default TopLoadingBar
