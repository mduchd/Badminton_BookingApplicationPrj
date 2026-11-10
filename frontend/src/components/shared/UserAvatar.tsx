import { useState } from 'react'
import { User as UserIcon } from 'lucide-react'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  className?: string
  ringClassName?: string
  fallbackBgColor?: string
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  className = 'w-10 h-10',
  ringClassName = 'ring-2 ring-white/90',
  fallbackBgColor = 'bg-[#168039] text-white',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : null

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={`${className} rounded-full object-cover shrink-0 ${ringClassName}`}
      />
    )
  }

  return (
    <div
      className={`${className} rounded-full ${fallbackBgColor} flex items-center justify-center font-bold shrink-0 select-none ${ringClassName}`}
      aria-label={name || 'Avatar người dùng'}
    >
      {initial ? (
        <span className="text-sm font-bold uppercase leading-none">{initial}</span>
      ) : (
        <UserIcon className="w-1/2 h-1/2" />
      )}
    </div>
  )
}
