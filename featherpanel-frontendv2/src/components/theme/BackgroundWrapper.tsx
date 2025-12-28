'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { useEffect, useState } from 'react'

export default function BackgroundWrapper({ children }: { children: React.ReactNode }) {
	const { backgroundType, backgroundImage } = useTheme()
	const [mounted, setMounted] = useState(() => typeof window !== 'undefined')

	if (!mounted) {
		return <>{children}</>
	}

	const getBackgroundStyle = () => {
		if (backgroundType === 'image' && backgroundImage) {
			return {
				backgroundImage: `url(${backgroundImage})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
				backgroundAttachment: 'fixed',
			}
		}

		if (backgroundType === 'gradient' && backgroundImage) {
			const gradients: Record<string, string> = {
				'purple-dream': 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 50%, rgba(147, 51, 234, 0.1) 100%)',
				'ocean-breeze': 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(6, 182, 212, 0.1) 100%)',
				'sunset-glow': 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(239, 68, 68, 0.05) 50%, rgba(251, 146, 60, 0.1) 100%)',
				'forest-mist': 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(34, 197, 94, 0.1) 100%)',
				'rose-garden': 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 50%, rgba(236, 72, 153, 0.1) 100%)',
				'golden-hour': 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 50%, rgba(251, 191, 36, 0.1) 100%)',
			}

			return {
				background: gradients[backgroundImage] || gradients['purple-dream'],
			}
		}

		if (backgroundType === 'pattern') {
			return {
				backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)',
				backgroundSize: '16px 16px',
			}
		}

		return {}
	}

	return (
		<div
			className="min-h-screen transition-all duration-500"
			style={getBackgroundStyle()}
		>
			{children}
		</div>
	)
}
