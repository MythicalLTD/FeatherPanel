'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { Dialog, DialogPanel, DialogTitle, Description as DialogDescription } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Mail, RefreshCw, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'

interface MailItem {
	id: number
	subject: string
	body: string
	status: 'pending' | 'sent' | 'failed'
	created_at: string
}

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

export default function MailTab() {
	const { t } = useTranslation()
	const [mails, setMails] = useState<MailItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [mailModalOpen, setMailModalOpen] = useState(false)
	const [selectedMail, setSelectedMail] = useState<MailItem | null>(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [pagination, setPagination] = useState<PaginationInfo | null>(null)

	const fetchMails = useCallback(async (page: number = 1) => {
		setLoading(true)
		setError(false)
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '10',
			})
			if (searchQuery.trim()) {
				params.append('search', searchQuery.trim())
			}

			const { data } = await axios.get(`/api/user/mails?${params.toString()}`)
			if (data.success && data.data) {
				setMails(data.data.mails || [])
				setPagination(data.data.pagination)
				setCurrentPage(page)
			}
		} catch (err) {
			console.error('Failed to fetch mails:', err)
			setError(true)
		} finally {
			setLoading(false)
		}
	}, [searchQuery])

	useEffect(() => {
		fetchMails()
	}, [fetchMails])

	useEffect(() => {
		const timeout = setTimeout(() => {
			if (searchQuery !== undefined) {
				fetchMails(1)
			}
		}, 500)
		return () => clearTimeout(timeout)
	}, [searchQuery, fetchMails])

	const openMailModal = (mail: MailItem) => {
		setSelectedMail(mail)
		setMailModalOpen(true)
	}

	const getIframeContent = (htmlContent: string): string => {
		return `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					body {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
						line-height: 1.6;
						color: #333;
						margin: 0;
						padding: 20px;
						background: white;
					}
					img { max-width: 100%; height: auto; }
					table { max-width: 100%; border-collapse: collapse; }
					td, th { padding: 8px; border: 1px solid #ddd; }
					a { color: #007bff; text-decoration: none; }
					a:hover { text-decoration: underline; }
				</style>
			</head>
			<body>${htmlContent}</body>
			</html>
		`
	}

	const getStatusVariant = (status: string) => {
		switch (status) {
			case 'sent':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
			case 'failed':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
			default:
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
		}
	}

	const formatDate = (dateString: string) => {
		if (!dateString) return t('common.unknown')
		try {
			const date = new Date(dateString)
			const now = new Date()
			const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

			if (diffInHours < 1) {
				return t('account.mail.justNow')
			} else if (diffInHours < 24) {
				return t('account.mail.hoursAgo', { hours: String(diffInHours) })
			} else if (diffInHours < 48) {
				return t('account.mail.yesterday')
			} else {
				return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
			}
		} catch {
			return t('common.unknown')
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

	if (loading && mails.length === 0) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="flex items-center gap-3">
					<div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
					<span className="text-muted-foreground">{t('account.mail.loading')}</span>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<Mail className="h-8 w-8 mx-auto mb-2 text-destructive" />
					<p className="text-destructive mb-2">{t('account.mail.loadError')}</p>
					<Button variant="outline" onClick={() => fetchMails(currentPage)}>
						{t('account.mail.tryAgain')}
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold text-foreground">{t('account.mail.title')}</h3>
					<p className="text-sm text-muted-foreground mt-1">{t('account.mail.description')}</p>
				</div>
				<Button onClick={() => fetchMails(currentPage)} variant="outline" size="sm">
					<RefreshCw className="w-4 h-4 mr-2" />
					{t('account.mail.refresh')}
				</Button>
			</div>

			{/* Search */}
			<div className="relative">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={t('account.mail.searchPlaceholder')}
					className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			<div className="text-sm text-muted-foreground text-center">
				{pagination ? (
					<span>
						{t('account.mail.showingMails', { 
							from: String(pagination.from), 
							to: String(pagination.to), 
							total: String(pagination.total_records) 
						})}
					</span>
				) : (
					<span>{t('account.mail.totalMailsCount', { count: String(mails.length) })}</span>
				)}
			</div>

			{/* Mail List */}
			{mails.length > 0 ? (
				<div className="space-y-4">
					{mails.map((mail) => (
						<div key={mail.id} className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
							<div className="flex items-start justify-between mb-3">
								<div className="flex-1">
									<h4 className="text-sm font-semibold text-foreground mb-2">{mail.subject}</h4>
									<Button variant="outline" size="sm" onClick={() => openMailModal(mail)}>
										<Mail className="w-4 h-4 mr-1" />
										{t('account.mail.viewFull')}
									</Button>
								</div>
								<div className={cn("px-2 py-1 rounded text-xs font-medium", getStatusVariant(mail.status))}>
									{t(`account.mail.status.${mail.status}`)}
								</div>
							</div>
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Clock className="h-3 w-3" />
								<span>{formatDate(mail.created_at)}</span>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="text-center py-12">
					<Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
					<h4 className="text-sm font-semibold text-foreground mb-2">
						{searchQuery ? t('account.mail.noSearchResults') : t('account.mail.noMails')}
					</h4>
					<p className="text-sm text-muted-foreground">
						{searchQuery ? t('account.mail.tryDifferentSearch') : t('account.mail.noMailsDescription')}
					</p>
				</div>
			)}

			{/* Pagination */}
			{pagination && pagination.total_pages > 1 && (
				<div className="flex items-center justify-between gap-4 pt-4">
					<div className="text-sm text-muted-foreground">
                        {t('dashboard.knowledgebase.page')} {pagination.current_page} {t('dashboard.knowledgebase.of')} {pagination.total_pages}
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={!pagination.has_prev}
							onClick={() => fetchMails(pagination.current_page - 1)}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<div className="flex items-center gap-1">
							{visiblePages().map((page) => (
								<Button
									key={page}
									variant={page === pagination.current_page ? 'default' : 'outline'}
									size="sm"
									onClick={() => fetchMails(page)}
								>
									{page}
								</Button>
							))}
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={!pagination.has_next}
							onClick={() => fetchMails(pagination.current_page + 1)}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}

			{/* Mail Modal */}
			<Dialog open={mailModalOpen} onClose={() => setMailModalOpen(false)} className="relative z-50">
				<div className="fixed inset-0 bg-black/30" aria-hidden="true" />
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<DialogPanel className="w-full max-w-5xl max-h-[90vh] rounded-xl bg-card border border-border p-6 shadow-xl flex flex-col">
						<DialogTitle className="text-xl font-semibold text-foreground mb-2">
							{selectedMail?.subject}
						</DialogTitle>
						<DialogDescription className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								<span>{selectedMail ? formatDate(selectedMail.created_at) : ''}</span>
							</div>
							<div className={cn("px-2 py-1 rounded text-xs font-medium", getStatusVariant(selectedMail?.status || 'pending'))}>
								{selectedMail ? t(`account.mail.status.${selectedMail.status}`) : ''}
							</div>
						</DialogDescription>

						<div className="flex-1 overflow-y-auto">
							{selectedMail && (
								<iframe
									srcDoc={getIframeContent(selectedMail.body)}
									className="w-full h-full min-h-[60vh] border-0 bg-white rounded"
									sandbox="allow-same-origin"
									title={t('account.mail.mailContent')}
								/>
							)}
						</div>

						<div className="mt-4 flex justify-end">
							<Button variant="outline" onClick={() => setMailModalOpen(false)}>
								{t('account.mail.close')}
							</Button>
						</div>
					</DialogPanel>
				</div>
			</Dialog>
		</div>
	)
}
