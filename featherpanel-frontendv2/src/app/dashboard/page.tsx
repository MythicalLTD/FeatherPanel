'use client'

import { useState, useEffect } from 'react'
import { Server, Clock } from 'lucide-react'
import { useTranslation } from '@/contexts/TranslationContext'
import { useSession } from '@/contexts/SessionContext'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'

// Types
import type { Server as ServerData } from '@/types/server'
import type { Activity } from '@/types/activity'

// Components
import { ServerCard } from '@/components/servers/ServerCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { AnnouncementBanner } from '@/components/dashboard/AnnouncementBanner'
import { TicketList } from '@/components/dashboard/TicketList'
import { KnowledgeBaseList } from '@/components/dashboard/KnowledgeBaseList'
import { useSettings } from '@/contexts/SettingsContext'

// API
import { serversApi } from '@/lib/servers-api'
import { useServersWebSocket } from '@/hooks/useServersWebSocket'
import { isServerAccessible } from '@/lib/server-utils'
import { isEnabled } from '@/lib/utils'

export default function DashboardPage() {
	const { t } = useTranslation()
	const { user } = useSession()
	const [servers, setServers] = useState<ServerData[]>([])
	const [activities, setActivities] = useState<Activity[]>([])
	const [loadingServers, setLoadingServers] = useState(true)
	const [loadingActivity, setLoadingActivity] = useState(true)
	const { settings } = useSettings()

	// WebSocket for live stats (dashboard only needs a few connection, but hooks are convenient)
	const {
		serverLiveData,
		isServerConnected,
		connectServers,
		disconnectAll
	} = useServersWebSocket()

	useEffect(() => {
		const fetchData = async () => {
			// Fetch Servers
			try {
				const response = await serversApi.getServers()
				const serversArray = Array.isArray(response.servers) ? response.servers : []
				// We only want top 3, but let's fetch all and slice for now (or backend pagination if available)
				// Assuming recently created is better, or just first 3
				setServers(serversArray.slice(0, 3))

				// Connect to websockets for these 3 servers
				if (serversArray.length > 0) {
					const serverUuids = serversArray.slice(0, 3).map(s => s.uuidShort)
					connectServers(serverUuids)
				}
			} catch (err) {
				console.error('Failed to fetch servers', err)
			} finally {
				setLoadingServers(false)
			}

			// Fetch Activity
			try {
				const { data } = await axios.get('/api/user/activities?limit=5')
				if (data.success && data.data) {
					setActivities(data.data.activities || [])
				}
			} catch (err) {
				console.error('Failed to fetch activity', err)
			} finally {
				setLoadingActivity(false)
			}
		}

		fetchData()

		return () => {
			disconnectAll()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const getServerLiveStats = (server: ServerData) => {
		const liveData = serverLiveData[server.uuidShort]
		if (!liveData?.stats) return null

		return {
			memory: liveData.stats.memoryUsage,
			disk: liveData.stats.diskUsage,
			cpu: liveData.stats.cpuUsage,
			status: liveData.status || server.status
		}
	}

	const formatDate = (dateString: string): string => {
		if (!dateString) return '-'
		try {
			const date = new Date(dateString)
			const now = new Date()
			const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

			if (diffInHours < 1) {
				return t('common.time.just_now')
			} else if (diffInHours < 24) {
				const hours = Math.floor(diffInHours)
				// Simplified pluralization handling for now, can be improved with i18next pluralization if fully configured
				return t('common.time.hours_ago').replace('{{count}}', hours.toString()).replace('{{s}}', hours > 1 ? 's' : '')
			} else if (diffInHours < 48) {
				return t('common.time.yesterday')
			} else {
				return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
			}
		} catch {
			return dateString
		}
	}

	return (
		<div className="space-y-8">
			{/* Welcome Section */}
			<div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 sm:p-6 md:p-8">
				<div className="relative z-10">
					<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
						{t('dashboard.welcome')}{user ? `, ${user.first_name}` : ''} 
					</h1>
					<p className="text-sm sm:text-base md:text-lg text-muted-foreground">
						{t('dashboard.subtitle')}
					</p>
				</div>
				{/* Decorative elements */}
				<div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl z-0" />
				<div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl z-0" />
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
				{/* Main Content (Servers, Announcements, Tickets) */}
				<div className="lg:col-span-2 space-y-6 md:space-y-8">
					{/* Announcements */}
					<AnnouncementBanner />

					{/* Servers List */}
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-bold">{t('dashboard.recent_servers.title')}</h2>
							<Link href="/dashboard/servers" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
								{t('dashboard.recent_servers.view_all')} &rarr;
							</Link>
						</div>

						{loadingServers ? (
							<div className="flex items-center justify-center py-12">
								<Server className="h-8 w-8 animate-spin text-muted-foreground" />
							</div>
						) : servers.length > 0 ? (
							<div className="space-y-4">
								{servers.map(server => (
									<ServerCard
										key={server.id}
										server={server}
										layout="list"
										 serverUrl={`/server/${server.uuidShort}`}
										liveStats={getServerLiveStats(server)}
										isConnected={isServerConnected(server.uuidShort)}
										t={t}
										folders={[]}
										onAssignFolder={() => { }}
										onUnassignFolder={() => { }}
									/>
								))}
							</div>
						) : (
							<div className="rounded-xl border border-border bg-card p-12 text-center">
								<Server className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
								<p className="text-muted-foreground font-medium">{t('dashboard.recent_servers.no_servers')}</p>
								<p className="text-sm text-muted-foreground/70 mt-1">
									{t('dashboard.recent_servers.create_first')}
								</p>
							</div>
						)}
					</div>

					{/* Support Tickets */}
					<div className="space-y-6">
						{isEnabled(settings?.ticket_system_enabled) && (
							<TicketList t={t} />
						)}
					</div>

					{/* Knowledge Base */}
					<div className="space-y-6">
						{isEnabled(settings?.knowledgebase_enabled) && (
							<KnowledgeBaseList t={t} />
						)}
					</div>
				</div>

				{/* Sidebar (Activity & Profile) */}
				<div className="space-y-8">
					{/* User Profile Card */}
					{user && (
						<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
							<div className="flex items-center gap-4">
								{user.avatar ? (
									<Image
										src={user.avatar}
										alt={`${user.first_name} ${user.last_name}`}
										width={64}
										height={64}
										unoptimized
										className="h-16 w-16 rounded-full border-2 border-primary/20 object-cover"
									/>
								) : (
									<div className="h-16 w-16 rounded-full bg-linear-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center">
										<span className="text-2xl font-semibold text-primary">
											{`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()}
										</span>
									</div>
								)}
								<div className="flex-1 min-w-0">
									<h2 className="text-xl font-semibold text-foreground truncate mb-1">
										{user.first_name} {user.last_name}
									</h2>
									{user.role && (
										<div className="mb-1">
											<span
												className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold"
												style={{
													backgroundColor: `${user.role.color}20`,
													color: user.role.color,
													border: `1px solid ${user.role.color}40`
												}}
											>
												{user.role.display_name}
											</span>
										</div>
									)}
									<p className="text-sm text-muted-foreground truncate">@{user.username}</p>
								</div>
							</div>
						</div>
					)}

					{/* Activity Feed */}
					<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-lg font-bold">{t('dashboard.activity.title')}</h2>
							<Link href="/dashboard/account?tab=activity" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
								{t('dashboard.activity.view_all')} &rarr;
							</Link>
						</div>

						{loadingActivity ? (
							<div className="flex items-center justify-center py-8">
								<Clock className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : activities.length > 0 ? (
							<ActivityFeed activities={activities} formatDate={formatDate} />
						) : (
							<div className="text-center py-8">
								<Clock className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
								<p className="text-sm text-muted-foreground">{t('dashboard.activity.no_activity')}</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
