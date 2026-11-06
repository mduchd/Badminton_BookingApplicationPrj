import React from 'react'
import { Feather } from 'lucide-react'

interface AppLogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  name?: string
  subtitle?: string
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
  variant = 'light',
  name = 'SMASHCOURT',
  subtitle = '',
}) => {
  const iconDimensions = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-11 h-11 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl',
  }[size]

  const featherDimensions = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size]

  const isLight = variant === 'light'

  // Dedicated flat emblem styling (No gradient, no 2-tone split)
  const badgeStyle = isLight
    ? 'bg-white text-[#1b7a42] shadow-xs'
    : 'bg-[#1b7a42] text-white shadow-xs'

  const titleColor = isLight ? 'text-white' : 'text-slate-900'
  const subColor = isLight ? 'text-emerald-100' : 'text-slate-500'

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Dedicated Badminton Shuttlecock Emblem */}
      <div
        className={`${iconDimensions} ${badgeStyle} flex items-center justify-center flex-shrink-0`}
        title={name}
      >
        <Feather className={`${featherDimensions} -rotate-45 stroke-[2.4]`} />
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-none">
          {/* Distinctive Single-Color Typography (Uniform 1-color solid text) */}
          <span
            className={`font-black tracking-wider uppercase font-sans ${titleColor} ${
              size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg sm:text-xl'
            }`}
          >
            {name}
          </span>
          {subtitle && (
            <span
              className={`font-semibold tracking-widest uppercase mt-0.5 ${subColor} ${
                size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs sm:text-sm' : 'text-xs'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
