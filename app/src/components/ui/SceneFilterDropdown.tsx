"use client"

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchEncounterScenes } from '@/api/encounter/encounter'

interface Props {
  value: string
  onChange: (v: string) => void
  className?: string
}

export default function SceneFilterDropdown({ value, onChange, className }: Props) {
  const { data: scenes } = useQuery({ queryKey: ['encounterScenes'], queryFn: () => fetchEncounterScenes() })
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className={`fixed top-20 right-6 z-40 animate-fade-in ${className ?? ''}`} ref={dropdownRef}>
      <div className="group relative">
        <div className="absolute inset-0 -m-0.5 bg-linear-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-all duration-300 pointer-events-none"></div>

        <div className={`relative w-80 bg-gray-900/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10 transition-all duration-300 overflow-hidden ${isOpen ? 'rounded-2xl' : 'rounded-2xl hover:shadow-purple-500/20 hover:border-purple-500/50'}`}>
          <button onClick={() => setIsOpen(v => !v)} className="relative flex items-center gap-3 px-5 py-3.5 w-full transition-all duration-300">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 transition-all duration-300">
              <svg className="w-4.5 h-4.5 text-purple-300" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
            </div>
            <div className="h-8 w-px bg-linear-to-b from-transparent via-purple-500/40 to-transparent" />
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] uppercase tracking-widest text-purple-300/70 font-semibold">Filters</label>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium truncate">{value || 'All Scenes'}</span>
                <svg className={`w-4 h-4 text-purple-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </button>

          <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="max-h-[700px] overflow-y-auto py-2 px-4 space-y-4">
              {/* Scene selector */}
              <div>
                <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Scene</div>
                <div className="flex flex-col gap-2">
                  <button
                    className={`text-left w-full p-2 rounded-lg text-sm transition-colors ${value === '' ? 'bg-purple-500/30 border border-purple-500 text-purple-200' : 'bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300'}`}
                    onClick={() => onChange('')}
                  >
                    All Scenes
                  </button>
                  {(scenes ?? []).map((s) => (
                    <button
                      key={s}
                      onClick={() => onChange(s)}
                      className={`text-left w-full p-2 rounded-lg text-sm transition-colors ${value === s ? 'bg-purple-500/30 border border-purple-500 text-purple-200' : 'bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
