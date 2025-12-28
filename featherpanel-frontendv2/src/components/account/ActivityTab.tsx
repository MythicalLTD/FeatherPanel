'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { Button } from '@/components/ui/button'
import { ClockIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import axios from 'axios'
import { toast } from 'sonner'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import type { Activity } from '@/types/activity'

interface PaginationInfo {
	current_page: number
	per_page: number
	total_records: number
	total_pages: number
	has_next: boolean
	has_prev: boolean
	from: number
	to: number
}

export default function ActivityTab() {
	const { t } = useTranslation()
	const [activities, setActivities] = useState<Activity[]>([])
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')
	const [pagination, setPagination] = useState<PaginationInfo | null>(null)
	const [currentPage, setCurrentPage] = useState(1)

	const fetchActivities = useCallback(async (page: number = 1) => {
		setLoading(true)
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '10',
			})
			if (searchQuery.trim()) {
				params.append('search', searchQuery.trim())
			}

			const { data } = await axios.get(`/api/user/activities?${params.toString()}`)
			if (data.success && data.data) {
				setActivities(data.data.activities || [])
				setPagination(data.data.pagination)
				setCurrentPage(page)
			}
		} catch (error) {
			console.error('Error fetching activities:', error)
			toast.error('Failed to load activity log')
		} finally {
			setLoading(false)
		}
	}, [searchQuery])

	useEffect(() => {
		fetchActivities()
	}, [])

	useEffect(() => {
		const timeout = setTimeout(() => {
			if (searchQuery !== undefined) {
				fetchActivities(1)
			}
		}, 500)
		return () => clearTimeout(timeout)
	}, [searchQuery])

	const formatDate = (dateString: string): string => {
		if (!dateString) return '-'
		try {
			const date = new Date(dateString)
			const now = new Date()
			const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

			if (diffInHours < 1) {
				return 'Just now'
			} else if (diffInHours < 24) {
				const hours = Math.floor(diffInHours)
				return `${hours} hour${hours > 1 ? 's' : ''} ago`
			} else if (diffInHours < 48) {
				return 'Yesterday'
			} else {
				return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
			}
		} catch {
			return dateString
		}
	}

	const visiblePages = () => {
		if (!pagination) return []
		const pages: number[] = []
		const total = pagination.total_pages
		const current = pagination.current_page

		pages.push(1)
		for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
			if (!pages.includes(i)) pages.push(i)
		}
		if (total > 1 && !pages.includes(total)) {
			pages.push(total)
		}
		return pages.sort((a, b) => a - b)
	}

	if (loading && activities.length === 0) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="flex items-center gap-3">
					<div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
					<span className="text-muted-foreground">{t('account.activity.loading')}</span>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold text-foreground">{t('account.activity.title')}</h3>
				<p className="text-sm text-muted-foreground mt-1">{t('account.activity.description')}</p>
			</div>

			{/* Search */}
			<div className="relative">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={t('account.activity.searchPlaceholder')}
					className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			{/* Stats */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{pagination ? (
						<span>
							Showing {pagination.from} to {pagination.to} of {pagination.total_records} activities
						</span>
					) : (
						<span>{activities.length} activities</span>
					)}
				</p>
				<Button variant="outline" size="sm" onClick={() => fetchActivities(currentPage)}>
					<ArrowPathIcon className="w-4 h-4 mr-2" />
					{t('account.activity.refresh')}
				</Button>
			</div>

			{/* Timeline */}
			{activities.length > 0 ? (
				<ActivityFeed activities={activities} formatDate={formatDate} />
			) : (
				<div className="text-center py-12">
					<ClockIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
					<h4 className="text-sm font-semibold text-foreground mb-2">
						{searchQuery ? 'No search results' : t('account.activity.noActivities')}
					</h4>
					<p className="text-sm text-muted-foreground">
						{searchQuery ? 'Try a different search term' : 'Your recent activity will appear here'}
					</p>
				</div>
			)}

			{/* Pagination */}
			{pagination && pagination.total_pages > 1 && (
				<div className="flex items-center justify-between gap-4 pt-4">
					<div className="text-sm text-muted-foreground">
						Page {pagination.current_page} of {pagination.total_pages}
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={!pagination.has_prev}
							onClick={() => fetchActivities(pagination.current_page - 1)}
						>
							<ChevronLeftIcon className="h-4 w-4" />
						</Button>
						<div className="flex items-center gap-1">
							{visiblePages().map((page) => (
								<Button
									key={page}
									variant={page === pagination.current_page ? 'default' : 'outline'}
									size="sm"
									onClick={() => fetchActivities(page)}
								>
									{page}
								</Button>
							))}
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={!pagination.has_next}
							onClick={() => fetchActivities(pagination.current_page + 1)}
						>
							<ChevronRightIcon className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
