'use client'

import { useState } from 'react'

export default function AuthLoading() {
  const [accentColor] = useState(() => {
    if (typeof window === 'undefined') return '262 83% 58%'
    
    const savedAccent = localStorage.getItem('accentColor') || 'purple'
    const colors: Record<string, string> = {
      purple: '262 83% 58%',
      blue: '217 91% 60%',
      green: '142 71% 45%',
      red: '0 84% 60%',
      orange: '25 95% 53%',
      pink: '330 81% 60%',
      teal: '173 80% 40%',
      yellow: '48 96% 53%',
    }
    return colors[savedAccent] || colors.purple
  })

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="relative">
        {/* Spinning ring */}
        <div 
          className="h-12 w-12 rounded-full border-3 border-transparent animate-spin"
          style={{
            borderTopColor: `hsl(${accentColor})`,
            borderRightColor: `hsl(${accentColor} / 0.3)`,
            animationDuration: '0.6s'
          }}
        />
        
        {/* Pulsing center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="h-2 w-2 rounded-full animate-pulse"
            style={{
              backgroundColor: `hsl(${accentColor})`,
              animationDuration: '1.2s'
            }}
          />
        </div>
      </div>
    </div>
  )
}
