/* eslint-disable react-hooks/unsupported-syntax */
'use client'

import { Fragment, useState, useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import {
	X,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react'
import NextImage from 'next/image'
import Link from 'next/link'
import { useSettings } from '@/contexts/SettingsContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { useNavigation } from '@/hooks/useNavigation'
import { useTranslation } from '@/contexts/TranslationContext'
import type { NavigationItem } from '@/types/navigation'

interface SidebarProps {
	mobileOpen: boolean
	setMobileOpen: (open: boolean) => void
}

// Move SidebarContent outside to avoid creating component during render
function SidebarContent({
	mobile = false,
	collapsed,
	settings,
	pathname,
	setMobileOpen,
	groupedItems,
}: {
	mobile?: boolean
	collapsed: boolean
	settings: { app_name?: string; app_version?: string; app_logo_white?: string; app_logo_dark?: string } | null
	pathname: string
	router: ReturnType<typeof useRouter>
	setMobileOpen: (open: boolean) => void
	groupedItems: Record<string, NavigationItem[]>
}) {
	const { theme } = useTheme()
    const { t } = useTranslation()
    
    // State for collapsed groups, initialized from localStorage
    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])

    // Load collapsed groups from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('featherpanel_collapsed_groups')
        if (saved) {
            try {
                setCollapsedGroups(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to parse collapsed groups', e)
            }
        }
    }, [])

    // Sync collapsed groups to localStorage
    const toggleGroup = (group: string) => {
        const newCollapsed = collapsedGroups.includes(group)
            ? collapsedGroups.filter(g => g !== group)
            : [...collapsedGroups, group]
        
        setCollapsedGroups(newCollapsed)
        localStorage.setItem('featherpanel_collapsed_groups', JSON.stringify(newCollapsed))
    }

	const isActive = (href: string) => {
		if (pathname === href) return true
        // Prevent /dashboard from matching /dashboard/tickets, /dashboard/servers etc.
        if (href === '/dashboard') return false
        
        // If it's the server root (/server/[uuid]), only match exact.
        // This prevents the "Console" item from being highlighted on plugin pages like /server/[uuid]/[plugin]
        const serverRootRegex = /^\/server\/[^\/]+$/
        if (serverRootRegex.test(href)) {
            return pathname === href
        }

		return pathname.startsWith(href + '/')
	}

    const renderGroupTitle = (group: string) => {
        const translationKey = `navigation.groups.${group}`
        const translated = t(translationKey)
        
        // If translation not found, t returns the key itself
        if (translated === translationKey) {
            // Return capitalized group name as fallback
            return group.charAt(0).toUpperCase() + group.slice(1)
        }
        
        return translated
    }

	const logoUrl = theme === 'dark'
		? (settings?.app_logo_dark || '/logo.png')
		: (settings?.app_logo_white || '/logo.png')

    // Define group order using keys from en.json
    const groupOrder = [
        'overview',
        'management',
        'files',
        'networking',
        'automation',
        'configuration',
        'feathercloud',
        'users',
        'tickets',
        'infrastructure',
        'content',
        'system',
        'support',
        'plugins'
    ]

    // Sort groups: explicit order first, then others alphabetically
    const sortedGroups = Object.keys(groupedItems).sort((a, b) => {
        const indexA = groupOrder.indexOf(a.toLowerCase())
        const indexB = groupOrder.indexOf(b.toLowerCase())
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        
        return a.localeCompare(b)
    })

	return (
		<div className="flex h-full flex-col">
			{/* Logo */}
			<Link href="/dashboard">
			<div className={cn(
				"flex items-center border-b border-border/50 transition-all",
				collapsed && !mobile ? "justify-center px-2 py-4" : "gap-3 px-4 py-4"
			)}>
				<div className={cn(
					"flex items-center justify-center shrink-0",
					collapsed && !mobile ? "w-10 h-10" : "w-10 h-10"
				)}>
					<NextImage
						src={logoUrl}
						alt={settings?.app_name || 'FeatherPanel'}
						width={40}
						height={40}
						className="w-full h-full object-contain"
						unoptimized
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
			</Link>

			{/* Navigation */}
			<nav className="flex-1 px-2 py-4 overflow-y-auto custom-scrollbar space-y-6">
				{sortedGroups.map((group) => {
                    const isCollapsed = collapsedGroups.includes(group)
                    
                    return (
                        <div key={group}>
                            {(!collapsed || mobile) && (
                                <button
                                    onClick={() => toggleGroup(group)}
                                    className="flex items-center justify-between w-full mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider group/header hover:text-accent-foreground transition-colors"
                                >
                                    <span>{renderGroupTitle(group)}</span>
                                    <ChevronRight className={cn(
                                        "h-3 w-3 transition-transform duration-200",
                                        !isCollapsed && "rotate-90"
                                    )} />
                                </button>
                            )}
                            <div className={cn(
                                "space-y-1 transition-all duration-200 overflow-hidden",
                                isCollapsed && (!collapsed || mobile) ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
                            )}>
                                {groupedItems[group].map((item) => {
                                const active = isActive(item.url)
                                const Icon = item.icon
                                const isPluginAction = !!item.pluginJs

                                if (isPluginAction) {
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                try {
                                                    eval(item.pluginJs!)
                                                } catch (e) {
                                                    console.error('Failed to execute plugin JS', e)
                                                }
                                                if (mobile) setMobileOpen(false)
                                            }}
                                            className={cn(
                                                "group flex items-center w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                                active
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                                collapsed && !mobile ? "justify-center" : "gap-3"
                                            )}
                                            title={collapsed && !mobile ? item.name : undefined}
                                        >
                                            {typeof Icon === 'string' ? (
                                                <span className={cn(
                                                    "shrink-0 flex items-center justify-center text-lg",
                                                     collapsed && !mobile ? "h-6 w-6" : "h-5 w-5"
                                                )}>
                                                    {Icon}
                                                </span>
                                            ) : (
                                                <Icon className={cn(
                                                    "shrink-0 transition-transform group-hover:scale-110",
                                                    collapsed && !mobile ? "h-6 w-6" : "h-5 w-5"
                                                )} />
                                            )}
                                            
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
                                }

                                const targetUrl = item.pluginRedirect || item.url

                                return (
                                    <Link
                                        key={item.id}
                                        href={targetUrl}
                                        onClick={() => {
                                             if (mobile) setMobileOpen(false)
                                        }}
                                        className={cn(
                                            "group flex items-center w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                            active
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                            collapsed && !mobile ? "justify-center" : "gap-3"
                                        )}
                                        title={collapsed && !mobile ? item.name : undefined}
                                    >
                                        {typeof Icon === 'string' ? (
                                            <span className={cn(
                                                "shrink-0 flex items-center justify-center text-lg",
                                                 collapsed && !mobile ? "h-6 w-6" : "h-5 w-5"
                                            )}>
                                                {Icon}
                                            </span>
                                        ) : (
                                            <Icon className={cn(
                                                "shrink-0 transition-transform group-hover:scale-110",
                                                collapsed && !mobile ? "h-6 w-6" : "h-5 w-5"
                                            )} />
                                        )}
                                        
                                        {(!collapsed || mobile) && (
                                            <span className="truncate">{item.name}</span>
                                        )}
                                        
                                        {item.badge && (!collapsed || mobile) && (
                                            <span className="ml-auto inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
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
							<ChevronRight className="h-5 w-5" />
						) : (
							<>
								<ChevronLeft className="h-5 w-5 mr-2" />
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
	const { navigationItems } = useNavigation()
	const [collapsed, setCollapsed] = useState(false)

    // Group items
    const groupedItems = useMemo(() => {
        return navigationItems.reduce((acc, item) => {
            const group = item.group || 'Other'
            if (!acc[group]) acc[group] = []
            acc[group].push(item)
            return acc
        }, {} as Record<string, NavigationItem[]>)
    }, [navigationItems])

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
											<X className="h-6 w-6 text-foreground" aria-hidden="true" />
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
										groupedItems={groupedItems}
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
						groupedItems={groupedItems}
					/>
				</div>
			</div>
		</>
	)
}
