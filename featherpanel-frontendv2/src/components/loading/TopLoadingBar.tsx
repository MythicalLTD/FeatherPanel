'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function TopLoadingBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    const handleStart = () => setLoading(true)
    const handleComplete = () => setLoading(false)
    
    handleStart()
    const timeout = setTimeout(handleComplete, 300)
    return () => clearTimeout(timeout)
  }, [pathname, searchParams])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1">
      <div 
        className="h-full animate-loading-bar"
        style={{
          background: `linear-gradient(90deg, transparent, hsl(${accentColor}), transparent)`,
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  )
}
