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

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useSettings } from '@/contexts/SettingsContext'

export default function AppPreloader() {
	const { settings } = useSettings()
	const [theme] = useState<'light' | 'dark'>(() => {
		if (typeof window === 'undefined') return 'dark'
		const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
		return savedTheme || (prefersDark ? 'dark' : 'light')
	})

	// Prevent body scroll while preloader is shown
	useEffect(() => {
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = ''
		}
	}, [])

	const appName = settings?.app_name || 'FeatherPanel'
	const logoUrl = theme === 'dark'
		? (settings?.app_logo_dark || settings?.app_logo_white || 'https://cdn.mythical.systems/featherpanel/logo.png')
		: (settings?.app_logo_white || 'https://cdn.mythical.systems/featherpanel/logo.png')

	return (
		<div className="fixed inset-0 z-9999 flex items-center justify-center bg-background animate-fade-in overflow-hidden">
			{/* Animated background gradient */}
			<div
				className="absolute inset-0 opacity-5 animate-pulse"
				style={{
					background: 'radial-gradient(circle at 50% 50%, rgb(255, 255, 255) 0%, transparent 50%)',
					animationDuration: '3s'
				}}
			/>

			{/* Loading content */}
			<div className="relative z-10 flex flex-col items-center gap-6">
				{/* Logo */}
				<div className="relative animate-fade-in" style={{ animationDelay: '0.1s' }}>
					<div className="h-20 w-20 flex items-center justify-center animate-bounce" style={{ animationDuration: '2s' }}>
						<Image
							src={logoUrl}
							alt={appName}
							fill
							className="object-contain"
							sizes="80px"
							priority
						/>
					</div>

					{/* Pulsing glow */}
					<div
						className="absolute inset-0 rounded-2xl blur-2xl animate-pulse bg-primary/20"
						style={{
							animationDuration: '2s'
						}}
					/>
				</div>

				{/* Spinner */}
				<div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
					<div
						className="h-12 w-12 rounded-full border-3 border-transparent animate-spin"
						style={{
							borderTopColor: 'hsl(var(--primary))',
							borderRightColor: 'hsl(var(--primary) / 0.3)',
							animationDuration: '0.8s'
						}}
					/>
				</div>

				{/* Loading text */}
				<div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
					<p className="text-lg font-semibold text-foreground">
						Loading {appName}
					</p>
					<p className="text-sm text-muted-foreground animate-pulse">
						Initializing application...
					</p>
				</div>
			</div>
		</div>
	)
}
