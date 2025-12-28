import { XMarkIcon, MegaphoneIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface AnnouncementBannerProps {
	t: (key: string) => string
}

export function AnnouncementBanner({ t }: AnnouncementBannerProps) {
	const [isVisible, setIsVisible] = useState(true)

	if (!isVisible) return null

	return (
		<div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg mb-6">
			<div className="relative z-10 flex items-start justify-between gap-4">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-2">
						<span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
							<MegaphoneIcon className="h-5 w-5 text-white" />
						</span>
						<span className="inline-flex items-center rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20">
							{t('dashboard.announcements.new')}
						</span>
					</div>
					<h3 className="text-lg font-bold text-white mb-1">
						{t('dashboard.announcements.sample_title')}
					</h3>
					<p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
						{t('dashboard.announcements.sample_message')}
					</p>
				</div>
				<button
					onClick={() => setIsVisible(false)}
					className="rounded-lg p-1 hover:bg-white/10 transition-colors"
				>
					<XMarkIcon className="h-5 w-5 text-white" />
				</button>
			</div>

			{/* Decorative background effects */}
			<div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
			<div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl" />
		</div>
	)
}
