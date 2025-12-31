'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import NextImage from 'next/image'
import { useTranslation } from '@/contexts/TranslationContext'
import { useSession } from '@/contexts/SessionContext'
import { Tab } from '@headlessui/react'
import { cn } from '@/lib/utils'
import ProfileTab from '@/components/account/ProfileTab'
import SettingsTab from '@/components/account/SettingsTab'
import SshKeysTab from '@/components/account/SshKeysTab'
import ApiKeysTab from '@/components/account/ApiKeysTab'
import ActivityTab from '@/components/account/ActivityTab'
import MailTab from '@/components/account/MailTab'

export default function AccountPage() {
	const { t } = useTranslation()
	const { user } = useSession()
	const searchParams = useSearchParams()
	const router = useRouter()

	const tabs = [
		{ id: 'profile', name: t('account.profile'), component: ProfileTab },
		{ id: 'settings', name: t('account.settings'), component: SettingsTab },
		{ id: 'ssh-keys', name: t('account.sshKeys.title'), component: SshKeysTab },
		{ id: 'api-keys', name: t('account.apiKeys.title'), component: ApiKeysTab },
		{ id: 'activity', name: t('account.activity.title'), component: ActivityTab },
		{ id: 'mail', name: t('account.mail.title'), component: MailTab }
	]

	const initialTabIndex = tabs.findIndex(tab => tab.id === searchParams.get('tab'))
	const [selectedIndex, setSelectedIndex] = useState(initialTabIndex >= 0 ? initialTabIndex : 0)

	const handleTabChange = (index: number) => {
		setSelectedIndex(index)
		router.replace(`/dashboard/account?tab=${tabs[index].id}`)
	}

	const formatDate = (dateString?: string) => {
		if (!dateString) return t('account.unknown')
		try {
			return new Date(dateString).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			})
		} catch {
			return t('account.unknown')
		}
	}

	const getUserInitials = () => {
		if (!user) return 'U'
		return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'
	}

	return (
		<div className="space-y-6">
			{/* Profile Card */}
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<div className="flex flex-col items-center text-center gap-4">
					{user?.avatar ? (
						<NextImage
							src={user.avatar}
							alt={user.username || 'User avatar'}
							width={96}
							height={96}
							className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-primary/20 object-cover"
						/>
					) : (
						<div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-linear-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center">
							<span className="text-2xl font-semibold text-primary">{getUserInitials()}</span>
						</div>
					)}
					<div className="space-y-2">
						<h2 className="text-xl sm:text-2xl font-bold text-foreground">{user?.username}</h2>
						<p className="text-muted-foreground text-sm sm:text-base">{user?.email}</p>
						<p className="text-xs sm:text-sm text-muted-foreground">
							{t('account.memberSince')} {formatDate(user?.first_seen)}
						</p>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="rounded-xl border border-border bg-card shadow-sm">
				<Tab.Group selectedIndex={selectedIndex} onChange={handleTabChange}>
					{/* Mobile: Dropdown */}
					<div className="block sm:hidden p-4 border-b border-border">
						<select
							value={selectedIndex}
							onChange={(e) => handleTabChange(Number(e.target.value))}
							className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
						>
							{tabs.map((tab, index) => (
								<option key={tab.id} value={index}>
									{tab.name}
								</option>
							))}
						</select>
					</div>

					{/* Desktop: Tabs */}
					<div className="hidden sm:block border-b border-border">
						<Tab.List className="flex overflow-x-auto custom-scrollbar">
							{tabs.map((tab) => (
								<Tab
									key={tab.id}
									className={({ selected }) =>
										cn(
											'flex-1 min-w-0 px-4 py-3 text-sm font-medium transition-all focus:outline-none',
											'border-b-2 -mb-px',
											selected
												? 'border-primary text-primary'
												: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
										)
									}
								>
									<span className="truncate">{tab.name}</span>
								</Tab>
							))}
						</Tab.List>
					</div>

					<Tab.Panels className="p-6">
						{tabs.map((tab) => (
							<Tab.Panel key={tab.id} className="focus:outline-none">
								<tab.component />
							</Tab.Panel>
						))}
					</Tab.Panels>
				</Tab.Group>
			</div>
		</div>
	)
}
