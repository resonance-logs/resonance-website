'use client'

import React from 'react'
import { useBackground } from '@/context/BackgroundContext'
import { GlassCard } from '@/components/landing/GlassCard'

export const BackgroundToggle: React.FC = () => {
  const { enabled, setEnabled } = useBackground()

  return (
    <div className="fixed right-3 top-1/2 transform -translate-y-1/2 z-50">
      <GlassCard className="px-2 py-2 flex items-center gap-2">
        <button
          aria-pressed={!enabled}
          title={enabled ? 'Disable Background' : 'Enable Background'}
          onClick={() => setEnabled(!enabled)}
          className={`w-10 h-6 relative inline-flex items-center rounded-full transition-all duration-200 focus:outline-none ${enabled ? 'bg-purple-600' : 'bg-gray-600'}`}
          data-interactive="true"
        >
          <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full shadow-md transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`}
          />
        </button>
        <span className="hidden sm:block text-sm text-gray-200">Background</span>
      </GlassCard>
    </div>
  )
}

export default BackgroundToggle
