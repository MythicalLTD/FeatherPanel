'use client'

import { Fragment, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import {
	HomeIcon,
	ServerIcon,
	UserIcon,
	ShieldCheckIcon,
	Cog6ToothIcon,
	XMarkIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { useSettings } from '@/contexts/SettingsContext'
import { useSession } from '@/contexts/SessionContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import Permissions from '@/lib/permissions'

interface SidebarProps {
	mobileOpen: boolean
	setMobileOpen: (open: boolean) => void
}

interface NavItem {
	name: string
	href: string
	icon: React.ComponentType<{ className?: string }>
	badge?: string
	requiresPermission?: string
}

const getNavigation = (hasPermission: (permission: string) => boolean): NavItem[] => {
	const nav: NavItem[] = [
		{ name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
		{ name: 'Servers', href: '/servers', icon: ServerIcon },
		{ name: 'Account', href: '/account', icon: UserIcon },
	]

	// Add Admin link if user has permission
	if (hasPermission(Permissions.ADMIN_DASHBOARD_VIEW)) {
		nav.push({ name: 'Admin', href: '/admin', icon: ShieldCheckIcon })
	}

	nav.push({ name: 'Settings', href: '/settings', icon: Cog6ToothIcon })

	return nav
}

// Move SidebarContent outside to avoid creating component during render
function SidebarContent({
	mobile = false,
	collapsed,
	settings,
	pathname,
	router,
	setMobileOpen,
	navigation,
}: {
	mobile?: boolean
	collapsed: boolean
	settings: { app_name?: string; app_version?: string; app_logo_white?: string; app_logo_dark?: string } | null
	pathname: string
	router: ReturnType<typeof useRouter>
	setMobileOpen: (open: boolean) => void
	navigation: NavItem[]
}) {
	const { theme } = useTheme()
	const isActive = (href: string) => {
		return pathname === href || pathname.startsWith(href + '/')
	}

	const logoUrl = theme === 'dark'
		? (settings?.app_logo_dark || '/logo.png')
		: (settings?.app_logo_white || '/logo.png')

	return (
		<div className="flex h-full flex-col">
			{/* Logo */}
			<div className={cn(
				"flex items-center border-b border-border/50 transition-all",
				collapsed && !mobile ? "justify-center px-2 py-4" : "gap-3 px-4 py-4"
			)}>
				<div className={cn(
					"flex items-center justify-center shrink-0",
					collapsed && !mobile ? "w-10 h-10" : "w-10 h-10"
				)}>
					<img
						src={logoUrl}
						alt={settings?.app_name || 'FeatherPanel'}
						className="w-full h-full object-contain"
					/>
				</div>

				{(!collapsed || mobile) && (
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="font-semibold text-base truncate">
							{settings?.app_name || 'FeatherPanel'}
						</span>
						<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 w-fit">
							v{settings?.app_version || '1.0.0'}
						</span>
					</div>
				)}
			</div>

			{/* Navigation */}
			<nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
				{navigation.map((item) => {
					const active = isActive(item.href)
					const Icon = item.icon

					return (
						<button
							key={item.name}
							onClick={() => {
								router.push(item.href)
								if (mobile) setMobileOpen(false)
							}}
							className={cn(
								"group flex items-center w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
								active
									? "bg-primary text-primary-foreground shadow-sm"
									: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
								collapsed && !mobile ? "justify-center" : "gap-3"
							)}
						>
							<Icon className={cn(
								"shrink-0 transition-transform group-hover:scale-110",
								collapsed && !mobile ? "h-6 w-6" : "h-5 w-5"
							)} />
							{(!collapsed || mobile) && (
								<span className="truncate">{item.name}</span>
							)}
							{item.badge && (!collapsed || mobile) && (
								<span className="ml-auto inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium">
									{item.badge}
								</span>
							)}
						</button>
					)
				})}
			</nav>

			{/* Collapse Button (Desktop only) */}
			{!mobile && (
				<div className="border-t border-border/50 p-2">
					<button
						onClick={() => {
							// This will be passed from parent
							if (typeof window !== 'undefined') {
								const event = new CustomEvent('toggle-sidebar')
								window.dispatchEvent(event)
							}
						}}
						className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
					>
						{collapsed ? (
							<ChevronRightIcon className="h-5 w-5" />
						) : (
							<>
								<ChevronLeftIcon className="h-5 w-5 mr-2" />
								<span>Collapse</span>
							</>
						)}
					</button>
				</div>
			)}
		</div>
	)
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
	const pathname = usePathname()
	const router = useRouter()
	const { settings } = useSettings()
	const { hasPermission } = useSession()
	const [collapsed, setCollapsed] = useState(false)

	const navigation = getNavigation(hasPermission)

	useEffect(() => {
		const handleToggle = () => setCollapsed(prev => !prev)
		window.addEventListener('toggle-sidebar', handleToggle)
		return () => window.removeEventListener('toggle-sidebar', handleToggle)
	}, [])

	return (
		<>
			{/* Mobile sidebar */}
			<Transition.Root show={mobileOpen} as={Fragment}>
				<Dialog as="div" className="relative z-50 lg:hidden" onClose={setMobileOpen}>
					<Transition.Child
						as={Fragment}
						enter="transition-opacity ease-linear duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="transition-opacity ease-linear duration-300"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
					</Transition.Child>

					<div className="fixed inset-0 flex">
						<Transition.Child
							as={Fragment}
							enter="transition ease-in-out duration-300 transform"
							enterFrom="-translate-x-full"
							enterTo="translate-x-0"
							leave="transition ease-in-out duration-300 transform"
							leaveFrom="translate-x-0"
							leaveTo="-translate-x-full"
						>
							<Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
								<Transition.Child
									as={Fragment}
									enter="ease-in-out duration-300"
									enterFrom="opacity-0"
									enterTo="opacity-100"
									leave="ease-in-out duration-300"
									leaveFrom="opacity-100"
									leaveTo="opacity-0"
								>
									<div className="absolute left-full top-0 flex w-16 justify-center pt-5">
										<button
											type="button"
											className="-m-2.5 p-2.5"
											onClick={() => setMobileOpen(false)}
										>
											<span className="sr-only">Close sidebar</span>
											<XMarkIcon className="h-6 w-6 text-foreground" aria-hidden="true" />
										</button>
									</div>
								</Transition.Child>

								<div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r border-border">
									<SidebarContent
										mobile
										collapsed={collapsed}
										settings={settings}
										pathname={pathname}
										router={router}
										setMobileOpen={setMobileOpen}
										navigation={navigation}
									/>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</Dialog>
			</Transition.Root>

			{/* Desktop sidebar */}
			<div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col">
				<div className={cn(
					"flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r border-border transition-all duration-300",
					collapsed ? "w-16" : "w-64"
				)}>
					<SidebarContent
						collapsed={collapsed}
						settings={settings}
						pathname={pathname}
						router={router}
						setMobileOpen={setMobileOpen}
						navigation={navigation}
					/>
				</div>
			</div>
		</>
	)
}
