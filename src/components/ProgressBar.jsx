import React from 'react'

/**
 * A beautiful, premium progress bar matching the Instagram color palette gradient.
 * 
 * @param {object} props
 * @param {number} props.progress - The completion percentage (0 - 100).
 * @param {string} props.text - The description of the current processing step.
 */
export default function ProgressBar({ progress, text }) {
  return (
    <div className="w-full max-w-md mx-auto mt-8 px-6 py-5 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/5 shadow-2xl transition-all duration-300 animate-pulse-slow">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400 truncate max-w-[80%]">
          {text || 'Processing archive...'}
        </span>
        <span className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-400">
          {progress}%
        </span>
      </div>
      <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-3 overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
        <div 
          className="bg-gradient-to-r from-indigo-500 via-purple-500 via-pink-500 to-orange-500 h-full rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
