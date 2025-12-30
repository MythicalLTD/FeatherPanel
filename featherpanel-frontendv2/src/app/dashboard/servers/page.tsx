'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Server, ServerFolder } from '@/types/server'
import { isServerAccessible } from '@/lib/server-utils'
import { cn } from '@/lib/utils'
import { serversApi } from '@/lib/servers-api'
import { useServersWebSocket } from '@/hooks/useServersWebSocket'
import { useServersState } from '@/hooks/useServersState'
import { useFolders } from '@/hooks/useFolders'
import { useTranslation } from '@/contexts/TranslationContext'
import {
	Tab,
	TabGroup,
	TabList,
	TabPanel,
	TabPanels,
	Switch,
	Listbox,
	ListboxButton,
	ListboxOptions,
	ListboxOption,
	RadioGroup,
	RadioGroupOption,
	Transition
} from '@headlessui/react'
import {
	LayoutGrid,
	List,
	Filter,
	Check,
	ChevronsUpDown,
	RefreshCw,
	Trash2,
	Pencil,
	FolderPlus,
	TriangleAlert,
	Server as ServerIcon,
	Folder,
	ChevronLeft,
	ChevronRight
} from 'lucide-react'

// Import new components
import { ServerCard } from '@/components/servers/ServerCard'
import { EmptyState } from '@/components/servers/EmptyState'
import { FolderDialog } from '@/components/servers/FolderDialog'



export default function ServersPage() {
	const router = useRouter()
	const { t } = useTranslation()

	const sortOptions = [
		{ id: 'name', name: t('servers.sort.name') },
		{ id: 'status', name: t('servers.sort.status') },
		{ id: 'created', name: t('servers.sort.dateCreated') },
		{ id: 'updated', name: t('servers.sort.lastUpdated') }
	]

	const layoutOptions = [
		{ id: 'grid', name: t('servers.layout.grid'), icon: LayoutGrid },
		{ id: 'list', name: t('servers.layout.list'), icon: List }
	]

	// State management
	const {
		selectedLayout,
		selectedSort,
		showOnlyRunning,
		viewMode,
		setSelectedLayout,
		setSelectedSort,
		setShowOnlyRunning,
		setViewMode
	} = useServersState()

	// WebSocket for live stats
	const {
		serverLiveData,
		isServerConnected,
		connectServers,
		disconnectAll
	} = useServersWebSocket()

	// Folders from localStorage
	const { folders, serverAssignments, createFolder, updateFolder, deleteFolder, assignServerToFolder, unassignServer } = useFolders()

	// Local state
	const [servers, setServers] = useState<Server[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
	const [editingFolder, setEditingFolder] = useState<ServerFolder | null>(null)
	const [folderFormData, setFolderFormData] = useState({ name: '', description: '' })
	const [pagination, setPagination] = useState({
		current_page: 1,
		per_page: 10,
		total_records: 0,
		total_pages: 1,
		has_next: false,
		has_prev: false,
		from: 0,
		to: 0,
	})

	// Fetch servers and folders
	const fetchData = async (page = 1) => {
		try {
			setLoading(true)
			setError(null)
			const response = await serversApi.getServers(false, page, pagination.per_page)

			// Ensure serversData is an array
			const serversArray = Array.isArray(response.servers) ? response.servers : []
			setServers(serversArray)

			// Update pagination
			setPagination(response.pagination)

			// Connect to WebSockets for all servers
			if (serversArray.length > 0) {
				const serverUuids = serversArray.map(s => s.uuidShort)
				await connectServers(serverUuids)
			}
		} catch (err) {
			console.error('Failed to fetch servers:', err)
			setError(err instanceof Error ? err.message : t('servers.errorLoading'))
		} finally {
			setLoading(false)
		}
	}

	// Initial fetch
	useEffect(() => {
		fetchData()
		return () => {
			disconnectAll()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Apply usage of client-side folder assignments
	const serversWithFolders = servers.map(server => ({
		...server,
		folder_id: serverAssignments[server.uuidShort] || server.folder_id
	}))

	// Filter and sort servers
	const filteredServers = (Array.isArray(serversWithFolders) ? serversWithFolders : [])
		.filter(server =>
			server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			server.description?.toLowerCase().includes(searchQuery.toLowerCase())
		)
		.filter(server => !showOnlyRunning || server.status === 'running')

	const serversByFolder = folders.map(folder => ({
		...folder,
		servers: filteredServers.filter(s => s.folder_id === folder.id)
	}))

	const unassignedServers = filteredServers.filter(s => !s.folder_id)

	const openServerDetails = (server: Server) => {
		if (!isServerAccessible(server)) return
		router.push(`/dashboard/server/${server.uuidShort}`)
	}

	const openCreateFolder = () => {
		setEditingFolder(null)
		setFolderFormData({ name: '', description: '' })
		setIsFolderDialogOpen(true)
	}

	const openEditFolder = (folder: ServerFolder, e: React.MouseEvent) => {
		e.stopPropagation()
		setEditingFolder(folder)
		setFolderFormData({ name: folder.name, description: folder.description || '' })
		setIsFolderDialogOpen(true)
	}

	const handleSaveFolder = () => {
		if (!folderFormData.name.trim()) return

		if (editingFolder) {
			updateFolder(editingFolder.id, folderFormData.name, folderFormData.description)
		} else {
			createFolder(folderFormData.name, folderFormData.description)
		}
		setIsFolderDialogOpen(false)
		setFolderFormData({ name: '', description: '' })
	}

	const handleDeleteFolder = (folderId: number, e: React.MouseEvent) => {
		e.stopPropagation()
		if (!confirm(t('servers.confirmDeleteFolder'))) return
		deleteFolder(folderId)
	}

	const changePage = (newPage: number) => {
		if (newPage >= 1 && newPage <= pagination.total_pages) {
			fetchData(newPage)
		}
	}



	// Get live stats for a server
	const getServerLiveStats = (server: Server) => {
		const liveData = serverLiveData[server.uuidShort]
		if (!liveData?.stats) return null

		return {
			memory: liveData.stats.memoryUsage,
			disk: liveData.stats.diskUsage,
			cpu: liveData.stats.cpuUsage,
			status: liveData.status || server.status
		}
	}

	const selectedSortOption = sortOptions.find(o => o.id === selectedSort) || sortOptions[0]
	const selectedLayoutOption = layoutOptions.find(o => o.id === selectedLayout) || layoutOptions[0]

	return (
		<div className="min-h-screen p-4 sm:p-8 space-y-6 sm:space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl sm:text-4xl font-bold tracking-tight">{t('servers.title')}</h1>
					<p className="mt-2 text-sm sm:text-lg text-muted-foreground">
						{t('servers.description')}
					</p>
				</div>
			</div>

			{/* Toolbar */}
			<div className="flex flex-col gap-4 p-4 bg-card rounded-2xl border border-border">
				{/* Search Field - Full Width */}
				<div className="flex-1 w-full">
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={t('servers.searchPlaceholder')}
						className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
					/>
				</div>

				{/* Controls Grid */}
				<div className="flex flex-col sm:flex-row gap-4">
					{/* Actions Group (Sort & Layout) */}
					<div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 flex-1">
						{/* Sort Listbox */}
						<Listbox value={selectedSortOption} onChange={(option) => setSelectedSort(option.id)}>
							<div className="relative w-full sm:w-auto min-w-[140px]">
								<ListboxButton className="relative w-full cursor-pointer rounded-xl bg-background py-2.5 pl-3 pr-8 text-left border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm">
									<span className="flex items-center gap-2">
										<Filter className="h-4 w-4 text-muted-foreground shrink-0" />
										<span className="block truncate">{selectedSortOption.name}</span>
									</span>
									<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
										<ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
									</span>
								</ListboxButton>
								<Transition
									as={Fragment}
									leave="transition ease-in duration-100"
									leaveFrom="opacity-100"
									leaveTo="opacity-0"
								>
									<ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-popover border border-border py-1 shadow-2xl focus:outline-none text-sm">
										{sortOptions.map((option) => (
											<ListboxOption
												key={option.id}
												value={option}
												className={({ focus }) =>
													cn(
														'relative cursor-pointer select-none py-2 pl-9 pr-4 transition-colors',
														focus ? 'bg-primary/10 text-primary' : 'text-foreground'
													)
												}
											>
												{({ selected }) => (
													<>
														<span className={cn('block truncate', selected ? 'font-semibold' : 'font-normal')}>
															{option.name}
														</span>
														{selected && (
															<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
																<Check className="h-4 w-4" />
															</span>
														)}
													</>
												)}
											</ListboxOption>
										))}
									</ListboxOptions>
								</Transition>
							</div>
						</Listbox>

						{/* Layout RadioGroup */}
						<RadioGroup value={selectedLayoutOption} onChange={(option) => setSelectedLayout(option.id as 'grid' | 'list')}>
							<div className="flex h-full gap-1 p-1 bg-background rounded-xl border border-border">
								{layoutOptions.map((option) => (
									<RadioGroupOption
										key={option.id}
										value={option}
										className={({ checked }) =>
											cn(
												'flex-1 flex items-center justify-center cursor-pointer rounded-lg px-3 transition-all',
												checked
													? 'bg-primary text-primary-foreground shadow-sm'
													: 'text-muted-foreground hover:text-foreground hover:bg-muted'
											)
										}
									>
										{() => (
											<div className="flex items-center gap-2">
												<option.icon className="h-4 w-4" />
												<span className="sr-only sm:not-sr-only sm:text-sm font-medium">{option.name}</span>
											</div>
										)}
									</RadioGroupOption>
								))}
							</div>
						</RadioGroup>
					</div>

					{/* Toggles Group (Running Only & Refresh) */}
					<div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-border">
						{/* Running Only Switch */}
						<div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowOnlyRunning(!showOnlyRunning)}>
							<Switch
								checked={showOnlyRunning}
								onChange={setShowOnlyRunning}
								className="group relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 data-checked:bg-green-500 bg-muted shrink-0"
							>
								<span className="inline-block h-3 w-3 transform rounded-full bg-white shadow-lg transition-transform group-data-checked:translate-x-4 translate-x-1" />
							</Switch>
							<span className="text-sm font-medium whitespace-nowrap">{t('servers.runningOnly')}</span>
						</div>

						{/* Refresh Button */}
						<button
								onClick={() => fetchData()}
							disabled={loading}
							className="p-2.5 bg-background border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
							title={t('servers.refresh')}
						>
							<RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
						</button>
					</div>
				</div>
			</div>

			{/* Loading State */}
			{loading && (
				<div className="flex items-center justify-center py-24">
					<div className="flex flex-col items-center gap-4">
						<RefreshCw className="h-12 w-12 animate-spin text-primary" />
						<p className="text-muted-foreground">{t('servers.loading')}</p>
					</div>
				</div>
			)}

			{/* Error State */}
			{error && !loading && (
				<div className="flex items-center justify-center py-24">
					<div className="text-center max-w-md">
						<TriangleAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
						<h3 className="text-xl font-semibold mb-2">{t('servers.errorTitle')}</h3>
						<p className="text-muted-foreground mb-6">{error}</p>
						<button
								onClick={() => fetchData()}
							className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
						>
							{t('servers.retry')}
						</button>
					</div>
				</div>
			)}

			{/* Tabs for different views */}
			{!loading && !error && (
				<TabGroup selectedIndex={viewMode === 'all' ? 0 : 1} onChange={(index) => setViewMode(index === 0 ? 'all' : 'folders')}>
					<TabList className="flex gap-2 p-1 bg-card rounded-xl border border-border w-fit">
						<Tab
							className={({ selected }) =>
								cn(
									'px-6 py-3 text-sm font-semibold rounded-lg transition-all focus:outline-none',
									selected
										? 'bg-primary text-primary-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground hover:bg-muted'
								)
							}
						>
								{t('servers.allServers')} ({pagination.total_records})
						</Tab>
						<Tab
							className={({ selected }) =>
								cn(
									'px-6 py-3 text-sm font-semibold rounded-lg transition-all focus:outline-none',
									selected
										? 'bg-primary text-primary-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground hover:bg-muted'
								)
							}
						>
							{t('servers.byFolder')}
						</Tab>
					</TabList>

					<TabPanels className="mt-6">
						{/* All Servers Tab */}
						<TabPanel>
							{filteredServers.length === 0 ? (
								<EmptyState searchQuery={searchQuery} t={t} />
							) : (
								<div className={cn(
									selectedLayout === 'grid'
										? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
										: 'flex flex-col gap-4'
								)}>
									{filteredServers.map(server => (
										<ServerCard
											key={server.id}
											server={server}
											layout={selectedLayout}
											serverUrl={`/dashboard/server/${server.uuidShort}`}
											liveStats={getServerLiveStats(server)}
											isConnected={isServerConnected(server.uuidShort)}
											t={t}
											folders={folders}
											onAssignFolder={(folderId) => assignServerToFolder(server.uuidShort, folderId)}
											onUnassignFolder={() => unassignServer(server.uuidShort)}
										/>
									))}
								</div>
							)}

				{/* Pagination Controls */}
				{pagination.total_pages > 1 && (
					<div className="flex items-center justify-between py-6 px-4 mt-6 border-t border-border">
					<p className="text-sm text-muted-foreground">
						{t('servers.pagination.showing', { 
							from: String(pagination.from), 
							to: String(pagination.to), 
							total: String(pagination.total_records) 
						})}
					</p>
						<div className="flex items-center gap-2">
							<button
								onClick={() => changePage(pagination.current_page - 1)}
								disabled={!pagination.has_prev || loading}
								className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ChevronLeft className="h-5 w-5" />
							</button>
						<span className="px-4 py-2 text-sm font-medium">
							{t('servers.pagination.page', { 
								current: String(pagination.current_page), 
								total: String(pagination.total_pages) 
							})}
						</span>
							<button
								onClick={() => changePage(pagination.current_page + 1)}
								disabled={!pagination.has_next || loading}
								className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ChevronRight className="h-5 w-5" />
							</button>
						</div>
					</div>
				)}
						</TabPanel>

						{/* By Folder Tab */}
						<TabPanel>
							<div className="space-y-8">
								{/* Create Folder Button */}
								<button
									onClick={openCreateFolder}
									className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
								>
									<FolderPlus className="h-5 w-5" />
									{t('servers.createFolder')}
								</button>

								{serversByFolder.map(folder => (
									<div key={folder.id} className="space-y-4">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<Folder className="h-6 w-6 text-primary" />
												<div>
													<h3 className="text-xl font-semibold">{folder.name}</h3>
													{folder.description && (
														<p className="text-sm text-muted-foreground">{folder.description}</p>
													)}
												</div>
												<span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
													{folder.servers.length}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<button
													onClick={(e) => openEditFolder(folder, e)}
													className="p-2 hover:bg-muted rounded-lg transition-colors"
												>
													<Pencil className="h-5 w-5 text-muted-foreground" />
												</button>
												<button
													onClick={(e) => handleDeleteFolder(folder.id, e)}
													className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
												>
													<Trash2 className="h-5 w-5 text-destructive" />
												</button>
											</div>
										</div>
										{folder.servers.length > 0 && (
											<div className={cn(
												selectedLayout === 'grid'
													? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
													: 'flex flex-col gap-4'
											)}>
												{folder.servers.map(server => (
													<ServerCard
														key={server.id}
														server={server}
														layout={selectedLayout}
														serverUrl={`/dashboard/server/${server.uuidShort}`}
														liveStats={getServerLiveStats(server)}
														isConnected={isServerConnected(server.uuidShort)}
														t={t}
														folders={folders}
														onAssignFolder={(folderId) => assignServerToFolder(server.uuidShort, folderId)}
														onUnassignFolder={() => unassignServer(server.uuidShort)}
													/>
												))}
											</div>
										)}
									</div>
								))}

								{unassignedServers.length > 0 && (
									<div className="space-y-4">
										<div className="flex items-center gap-3">
											<ServerIcon className="h-6 w-6 text-muted-foreground" />
											<h3 className="text-xl font-semibold">{t('servers.unassigned')}</h3>
											<span className="px-3 py-1 bg-muted text-muted-foreground text-sm font-medium rounded-full">
												{unassignedServers.length}
											</span>
										</div>
										<div className={cn(
											selectedLayout === 'grid'
												? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
												: 'flex flex-col gap-4'
										)}>
											{unassignedServers.map(server => (
												<ServerCard
													key={server.id}
													server={server}
													layout={selectedLayout}
													serverUrl={`/dashboard/server/${server.uuidShort}`}
													liveStats={getServerLiveStats(server)}
													isConnected={isServerConnected(server.uuidShort)}
													t={t}
													folders={folders}
													onAssignFolder={(folderId) => assignServerToFolder(server.uuidShort, folderId)}
													onUnassignFolder={() => unassignServer(server.uuidShort)}
												/>
											))}
										</div>
									</div>
								)}
							</div>
						</TabPanel>
					</TabPanels>
				</TabGroup>
			)}

			{/* Folder Create/Edit Dialog */}
			<FolderDialog
				isOpen={isFolderDialogOpen}
				onClose={() => setIsFolderDialogOpen(false)}
				onSave={handleSaveFolder}
				editingFolder={editingFolder}
				formData={folderFormData}
				setFormData={setFolderFormData}
				t={t}
			/>
		</div>
	)
}
