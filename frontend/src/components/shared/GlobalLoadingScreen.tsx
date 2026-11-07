import React, { useEffect, useState } from 'react'
import { AppLogo } from './AppLogo'

interface GlobalLoadingScreenProps {
  /**
   * Thời gian hiển thị tối thiểu (ms) để người dùng có trải nghiệm mượt mà
   */
  minDuration?: number
  /**
   * Callback khi hoàn thành màn hình tải
   */
  onFinished?: () => void
}

export const GlobalLoadingScreen: React.FC<GlobalLoadingScreenProps> = ({
  minDuration = 800,
  onFinished,
}) => {
  const [progress, setProgress] = useState(15)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isDestroyed, setIsDestroyed] = useState(false)

  useEffect(() => {
    const startTime = Date.now()

    // Tiến trình tăng dần mượt mà
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const timeRatio = Math.min(elapsed / minDuration, 1)

      if (timeRatio < 0.7) {
        // Tăng nhanh ban đầu
        setProgress((prev) => Math.min(Math.round(prev + Math.random() * 12 + 8), 75))
      } else if (timeRatio < 1) {
        // Chậm lại ở đoạn cuối
        setProgress((prev) => Math.min(Math.round(prev + Math.random() * 6 + 2), 92))
      } else {
        // Hoàn tất 100%
        setProgress(100)
        clearInterval(interval)

        // Đợi 120ms để người dùng thấy 100% rồi mờ dần
        setTimeout(() => {
          setIsFadingOut(true)

          // Đợi hiệu ứng mờ dần (300ms) rồi gỡ bỏ hoàn toàn
          setTimeout(() => {
            setIsDestroyed(true)
            onFinished?.()
          }, 300)
        }, 120)
      }
    }, 60)

    return () => clearInterval(interval)
  }, [minDuration, onFinished])

  if (isDestroyed) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center select-none transition-opacity duration-300 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-label="Đang tải ứng dụng SmashCourt"
    >
      <div className="flex flex-col items-center">
        {/* Logo chuẩn nhận diện thương hiệu giống trên Navbar (bo góc chuẩn rounded-2xl, chỉ để tên sân, không subtitle) */}
        <AppLogo size="lg" variant="dark" />

        {/* Thanh load màu xanh bên dưới */}
        <div className="mt-6 w-48 sm:w-56 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1b7a42] rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default GlobalLoadingScreen
