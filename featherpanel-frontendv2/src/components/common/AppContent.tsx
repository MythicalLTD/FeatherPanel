'use client'

import { Suspense } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import TopLoadingBar from '@/components/loading/TopLoadingBar'
import AppPreloader from '@/components/common/AppPreloader'

export default function AppContent({ children }: { children: React.ReactNode }) {
  const { initialLoading } = useTranslation()

  if (initialLoading) {
    return <AppPreloader />
  }

  return (
    <div className="animate-fade-in">
      <Suspense fallback={null}>
        <TopLoadingBar />
      </Suspense>
      {children}
    </div>
  )
}
