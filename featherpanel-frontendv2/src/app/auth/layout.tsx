'use client'

import Link from 'next/link'
import ThemeCustomizer from '@/components/layout/ThemeCustomizer'
import { useTheme } from '@/contexts/ThemeContext'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { backgroundType, backgroundImage } = useTheme()

  const renderBackground = () => {
    const gradientMap: Record<string, string> = {
      'purple-dream': 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 50%, rgba(147, 51, 234, 0.1) 100%)',
      'ocean-breeze': 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(6, 182, 212, 0.1) 100%)',
      'sunset-glow': 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(239, 68, 68, 0.05) 50%, rgba(251, 146, 60, 0.1) 100%)',
      'forest-mist': 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(34, 197, 94, 0.1) 100%)',
      'rose-garden': 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 50%, rgba(236, 72, 153, 0.1) 100%)',
      'golden-hour': 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 50%, rgba(251, 191, 36, 0.1) 100%)',
    }

    switch (backgroundType) {
      case 'gradient':
        const gradient = gradientMap[backgroundImage] || gradientMap['purple-dream']
        return (
          <div 
            className="pointer-events-none absolute inset-0"
            style={{ background: gradient }}
          />
        )
      case 'solid':
        return null
      case 'pattern':
        return (
          <div 
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
              backgroundSize: '24px 24px'
            }}
          />
        )
      case 'image':
        return backgroundImage ? (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${backgroundImage})` }}
            />
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          </>
        ) : null
      default:
        return null
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6 md:p-10">
      {/* Dynamic background */}
      {renderBackground()}

      {/* Theme customizer */}
      <div className="pointer-events-auto absolute top-4 right-4 z-50">
        <ThemeCustomizer />
      </div>

      {/* Main content */}
      <div className="pointer-events-auto relative z-10 w-full max-w-md">
        {/* Logo and title section */}
        <div className="mb-6 flex flex-col items-center gap-4">
          <Link
            href="/"
            className="group flex flex-col items-center gap-3 font-medium transition-all duration-300 hover:scale-105"
          >

          </Link>
        </div>

        {/* Auth form with card styling */}
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-primary/30 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
          
          <div className="relative rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl p-8 shadow-2xl shadow-black/20 transition-all duration-300">
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground transition-all duration-200">
          <p className="mb-2 font-medium">
            Running on FeatherPanel v1.0.0
          </p>
          <a
            href="https://featherpanel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary transition-all duration-200 hover:text-primary/80 hover:underline underline-offset-4 font-medium"
          >
            MythicalSystems
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
