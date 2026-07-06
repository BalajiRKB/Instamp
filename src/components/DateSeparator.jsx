import React from 'react'

/**
 * Centered date chip between message groups — Instagram DM style.
 * Shows "Today", "Yesterday", or "Weekday, Mon DD, YYYY".
 */
export default function DateSeparator({ dateString }) {
  const label = (() => {
    try {
      // dateString is YYYY-MM-DD (local date key)
      const [year, month, day] = dateString.split('-').map(Number)
      // Use local midnight to avoid UTC-offset shifting the date
      const date = new Date(year, month - 1, day)

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)

      const isSame = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()

      if (isSame(date, today)) return 'Today'
      if (isSame(date, yesterday)) return 'Yesterday'

      // Same year → omit year (matches Instagram)
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    } catch {
      return dateString
    }
  })()

  return (
    <div className="flex justify-center my-5 select-none">
      <span className="text-[11px] font-semibold text-neutral-500 tracking-wide px-3 py-1 rounded-full bg-neutral-900">
        {label}
      </span>
    </div>
  )
}
