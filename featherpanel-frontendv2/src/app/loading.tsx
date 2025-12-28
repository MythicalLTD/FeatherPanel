'use client'

import { useState } from 'react'

export default function Loading() {
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="relative">
        {/* Spinning ring */}
        <div 
          className="h-16 w-16 rounded-full border-4 border-transparent animate-spin"
          style={{
            borderTopColor: `hsl(${accentColor})`,
            borderRightColor: `hsl(${accentColor} / 0.3)`,
            animationDuration: '0.8s'
          }}
        />
        
        {/* Pulsing center dot */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
        >
          <div 
            className="h-3 w-3 rounded-full animate-pulse"
            style={{
              backgroundColor: `hsl(${accentColor})`,
              animationDuration: '1.5s'
            }}
          />
        </div>

        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse"
          style={{
            backgroundColor: `hsl(${accentColor})`,
            animationDuration: '2s'
          }}
        />
      </div>
    </div>
  )
}
