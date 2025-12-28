'use client'

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
	Menu as MenuIcon,
	CircleUser,
	Settings,
	LogOut,
	ShieldCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import ThemeCustomizer from '@/components/layout/ThemeCustomizer'
import { useSession } from '@/contexts/SessionContext'
import Image from 'next/image'
import Permissions from '@/lib/permissions'

interface NavbarProps {
	onMenuClick: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
	const router = useRouter()
	const { user, logout, hasPermission } = useSession()

	const userNavigation = [
		{ name: 'Your Profile', href: '/account', icon: CircleUser },
	]

	const handleLogout = async () => {
		await logout()
	}

	const getUserInitials = () => {
		if (!user) return 'U'
		return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'
	}

	const getUserDisplayName = () => {
		if (!user) return 'User'
		return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User'
	}

	const canAccessAdmin = hasPermission(Permissions.ADMIN_DASHBOARD_VIEW)

	return (
		<div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
			{/* Mobile menu button */}
			<button
				type="button"
				className="-m-2.5 p-2.5 text-muted-foreground lg:hidden hover:text-foreground transition-colors"
				onClick={onMenuClick}
			>
				<span className="sr-only">Open sidebar</span>
				<MenuIcon className="h-6 w-6" aria-hidden="true" />
			</button>

			{/* Separator */}
			<div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />

			<div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
				<div className="flex flex-1 items-center">
					{/* Breadcrumbs or page title can go here */}
					<h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
				</div>

				<div className="flex items-center gap-x-2 sm:gap-x-4 lg:gap-x-6">
					{/* Admin Panel Button */}
					{canAccessAdmin && (
						<button
							onClick={() => router.push('/admin')}
							className="flex items-center gap-2 rounded-lg px-2 sm:px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
							title="Admin Panel"
						>
							<ShieldCheck className="h-5 w-5" />
							<span className="hidden lg:inline">Admin Area</span>
						</button>
					)}

					{/* Theme Customizer (includes language, background, theme, accent color) */}
					<ThemeCustomizer />

					{/* Separator */}
					<div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

					{/* Profile dropdown */}
					<Menu as="div" className="relative">
						<Menu.Button className="flex items-center gap-x-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
							<span className="sr-only">Open user menu</span>
							{user?.avatar ? (
								<Image
									src={user.avatar}
									alt={getUserDisplayName()}
									width={32}
									height={32}
									unoptimized
									className="h-8 w-8 rounded-full border border-primary/20 object-cover"
								/>
							) : (
								<div className="h-8 w-8 rounded-full bg-linear-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
									<span className="text-sm font-semibold text-primary">{getUserInitials()}</span>
								</div>
							)}
							<span className="hidden lg:flex lg:items-center">
								<span className="ml-2 text-sm font-semibold" aria-hidden="true">
									{getUserDisplayName()}
								</span>
							</span>
						</Menu.Button>
						<Transition
							as={Fragment}
							enter="transition ease-out duration-100"
							enterFrom="transform opacity-0 scale-95"
							enterTo="transform opacity-100 scale-100"
							leave="transition ease-in duration-75"
							leaveFrom="transform opacity-100 scale-100"
							leaveTo="transform opacity-0 scale-95"
						>
							<Menu.Items className="absolute right-0 z-10 mt-2.5 w-64 origin-top-right rounded-xl bg-card border border-border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
								{/* User Info Header */}
								<div className="px-4 py-3 border-b border-border">
									<div className="flex items-center gap-3 mb-2">
										{user?.avatar ? (
											<Image
												src={user.avatar}
												alt={getUserDisplayName()}
												width={40}
												height={40}
												unoptimized
												className="h-10 w-10 rounded-full border border-primary/20 object-cover"
											/>
										) : (
											<div className="h-10 w-10 rounded-full bg-linear-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
												<span className="text-sm font-semibold text-primary">{getUserInitials()}</span>
											</div>
										)}
										<div className="flex-1 min-w-0">
											<p className="text-sm font-semibold text-foreground truncate">{getUserDisplayName()}</p>
											<p className="text-xs text-muted-foreground truncate">@{user?.username || 'user'}</p>
										</div>
									</div>
									{user?.role && (
										<div className="flex items-center gap-2">
											<span
												className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
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
									<p className="text-xs text-muted-foreground mt-2 truncate">{user?.email || 'user@example.com'}</p>
								</div>

								{/* Navigation Items */}
								<div className="py-1">
									{userNavigation.map((item) => {
										const Icon = item.icon
										return (
											<Menu.Item key={item.name}>
												{({ active }) => (
													<button
														onClick={() => router.push(item.href)}
														className={cn(
															active ? 'bg-accent' : '',
															'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors'
														)}
													>
														<Icon className="h-5 w-5 text-muted-foreground" />
														{item.name}
													</button>
												)}
											</Menu.Item>
										)
									})}
								</div>

								{/* Logout */}
								<div className="border-t border-border py-1">
									<Menu.Item>
										{({ active }) => (
											<button
												onClick={handleLogout}
												className={cn(
													active ? 'bg-destructive/10' : '',
													'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive transition-colors'
												)}
											>
												<LogOut className="h-5 w-5" />
												Sign out
											</button>
										)}
									</Menu.Item>
								</div>
							</Menu.Items>
						</Transition>
					</Menu>
				</div>
			</div>
		</div>
	)
}
