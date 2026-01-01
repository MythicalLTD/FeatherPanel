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

import { X, Megaphone, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import type { Notification } from '@/types/notification'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

export function AnnouncementBanner() {
	const { notifications, dismissNotification } = useNotifications()

	if (notifications.length === 0) return null

	const getTypeStyles = (type: Notification['type']) => {
		switch (type) {
			case 'success':
				return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
			case 'warning':
				return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400'
			case 'error':
			case 'danger':
				return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
			case 'info':
			default:
				return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
		}
	}

	const getTypeIcon = (type: Notification['type']) => {
		switch (type) {
			case 'success': return CheckCircle
			case 'warning': return AlertTriangle
			case 'error':
			case 'danger': return AlertOctagon
			case 'info':
			default: return Megaphone
		}
	}

	return (
		<div className="space-y-4 mb-6">
			{notifications.map(notification => {
				const Icon = getTypeIcon(notification.type)
				const styles = getTypeStyles(notification.type)

				return (
					<div
						key={notification.id}
						className={cn(
							"relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all",
							styles
						)}
					>
						<div className="flex items-start justify-between gap-4">
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-1">
									<Icon className="h-5 w-5 opacity-80" />
									<h3 className="font-semibold text-sm uppercase tracking-wide opacity-90">
										{notification.title}
									</h3>
								</div>
								<div className="text-sm opacity-90 pl-7 prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-headings:my-1 prose-a:text-inherit prose-a:underline">
									<ReactMarkdown>
										{notification.message_markdown}
									</ReactMarkdown>
								</div>
							</div>
							
							{notification.is_dismissible && !notification.is_sticky && (
								<button
									onClick={() => dismissNotification(notification.id)}
									className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
									aria-label="Dismiss"
								>
									<X className="h-4 w-4 opacity-70" />
								</button>
							)}
						</div>
					</div>
				)
			})}
		</div>
	)
}
