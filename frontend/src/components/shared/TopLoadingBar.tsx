import React, { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'

export const TopLoadingBar: React.FC = () => {
  const location = useLocation()
  const isFetching = useIsFetching()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPathRef = useRef(location.pathname + location.search)

  const completeProgress = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setProgress(100)

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 200)
  }

  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setVisible(true)
    setProgress(20)

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 85
        }
        return prev + Math.floor(Math.random() * 15 + 10)
      })
    }, 80)

    // Tự động kết thúc nếu thao tác nhẹ và không có request kéo dài
    setTimeout(() => {
      completeProgress()
    }, 320)
  }

  // Kích hoạt khi chuyển route / tab
  useEffect(() => {
    const currentPath = location.pathname + location.search
    if (prevPathRef.current !== currentPath) {
      prevPathRef.current = currentPath
      startProgress()
    }
  }, [location.pathname, location.search])

  // Kích hoạt khi có API request qua React Query
  useEffect(() => {
    if (isFetching > 0) {
      startProgress()
    } else if (visible) {
      completeProgress()
    }
  }, [isFetching])

  if (!visible && progress === 0) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] h-[3px] bg-transparent pointer-events-none transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-[#1b7a42] transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export default TopLoadingBar
