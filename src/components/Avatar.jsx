import React, { useState } from 'react'

export default function Avatar({ convoId, name, sizeClasses = 'w-[54px] h-[54px]', textClasses = 'text-[14px]' }) {
  const [imgError, setImgError] = useState(false)

  const getInitials = (n) => {
    if (!n) return 'DM'
    const parts = n.trim().split(/[\s_]+/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return n.substring(0, 2).toUpperCase()
  }

  // Extract username from conversation ID (e.g., 'blessingjoshwa_17925972318018288' -> 'blessingjoshwa')
  const username = convoId ? convoId.split('_')[0] : ''
  const avatarUrl = username ? `https://unavatar.io/instagram/${username}` : ''

  return (
    <div className={`flex-shrink-0 ${sizeClasses} rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2.5px]`}>
      <div className={`w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-black text-white ${textClasses} overflow-hidden relative`}>
        {!imgError && avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={name} 
            onError={() => setImgError(true)}
            className="w-full h-full object-cover relative z-10"
          />
        ) : null}
        
        {/* Fallback initials underneath, visible if img fails or is loading */}
        <span className="absolute inset-0 flex items-center justify-center z-0">
          {getInitials(name)}
        </span>
      </div>
    </div>
  )
}
