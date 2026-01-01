/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
