'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import { cn } from '@/lib/utils'
import BackgroundWrapper from '@/components/theme/BackgroundWrapper'

function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null
	const value = `; ${document.cookie}`
	const parts = value.split(`; ${name}=`)
	if (parts.length === 2) return parts.pop()?.split(';').shift() || null
	return null
}

export default function AccountLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const router = useRouter()
	const [mobileOpen, setMobileOpen] = useState(false)
	const [mounted, setMounted] = useState(false)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
		// Check authentication via cookie
		const token = getCookie('remember_token')
		if (!token) {
			router.push('/auth/login')
		}
	}, [router])

	useEffect(() => {
		const handleToggle = () => setSidebarCollapsed(prev => !prev)
		window.addEventListener('toggle-sidebar', handleToggle)
		return () => window.removeEventListener('toggle-sidebar', handleToggle)
	}, [])

	if (!mounted) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
			</div>
		)
	}

	return (
		<BackgroundWrapper>
			<div className="min-h-screen">
				<Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

				<div className={cn(
					"transition-all duration-300",
					sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
				)}>
					<Navbar onMenuClick={() => setMobileOpen(true)} />

					<main className="py-6 px-4 sm:px-6 lg:px-8">
						<div className="mx-auto max-w-7xl">
							{children}
						</div>
					</main>
				</div>
			</div>
		</BackgroundWrapper>
	)
}
