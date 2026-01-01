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

'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { useSession } from '@/contexts/SessionContext'
import { useSettings } from '@/contexts/SettingsContext'
import { Dialog, DialogPanel, DialogTitle, Description as DialogDescription, Field, Label, Input as HeadlessInput } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Key, Plus, Trash2, Eye, Pencil, RefreshCw, Copy, Info } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'

interface ApiClient {
	id: number
	user_uuid: string
	name: string
	public_key?: string
	private_key?: string
	created_at: string
	updated_at: string
}

export default function ApiKeysTab() {
	const { t } = useTranslation()
	const { hasPermission } = useSession()
	const { settings } = useSettings()
	const [clients, setClients] = useState<ApiClient[]>([])
	const [loading, setLoading] = useState(true)
	const [isOpen, setIsOpen] = useState(false)
	const [viewModal, setViewModal] = useState(false)
	const [editModal, setEditModal] = useState(false)
	const [deleteModal, setDeleteModal] = useState(false)
	const [regenerateModal, setRegenerateModal] = useState(false)
	const [selectedClient, setSelectedClient] = useState<ApiClient | null>(null)
	const [clientName, setClientName] = useState('')
	const [searchQuery, setSearchQuery] = useState('')

	const canCreateApiKeys = settings?.user_allow_api_keys_create || hasPermission('admin.api.bypass_restrictions')

	const fetchClients = async () => {
		setLoading(true)
		try {
			const { data } = await axios.get('/api/user/api-clients')
			if (data.success) {
				setClients(data.data.api_clients || [])
			}
		} catch (error) {
			console.error('Error fetching API clients:', error)
			toast.error('Failed to load API clients')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchClients()
	}, [])

	const filteredClients = clients.filter(client =>
		client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		client.public_key?.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const handleCreateClient = async () => {
		try {
			const { data } = await axios.post('/api/user/api-clients', { name: clientName })
			if (data.success) {
				toast.success(t('account.apiKeys.keyCreated'))
				setIsOpen(false)
				setClientName('')
				// Show the created client with keys
				setSelectedClient(data.data)
				setViewModal(true)
				await fetchClients()
			}
		} catch (error) {
			console.error('Error creating API client:', error)
			toast.error(t('account.apiKeys.createFailed'))
		}
	}

	const handleEditClient = async () => {
		if (!selectedClient) return
		try {
			const { data } = await axios.put(`/api/user/api-clients/${selectedClient.id}`, { name: clientName })
			if (data.success) {
				toast.success(t('account.apiKeys.keyUpdated'))
				setEditModal(false)
				setSelectedClient(null)
				setClientName('')
				await fetchClients()
			}
		} catch (error) {
			console.error('Error updating API client:', error)
			toast.error('Failed to update API client')
		}
	}

	const viewClient = async (client: ApiClient) => {
		try {
			const { data } = await axios.get(`/api/user/api-clients/${client.id}`)
			if (data.success) {
				setSelectedClient(data.data)
				setViewModal(true)
			}
		} catch (error) {
			console.error('Error loading API client:', error)
			toast.error('Failed to load API client')
		}
	}

	const editClient = async (client: ApiClient) => {
		try {
			const { data } = await axios.get(`/api/user/api-clients/${client.id}`)
			if (data.success) {
				setSelectedClient(data.data)
				setClientName(data.data.name)
				setEditModal(true)
			}
		} catch (error) {
			console.error('Error loading API client:', error)
			toast.error('Failed to load API client')
		}
	}

	const deleteClient = async () => {
		if (!selectedClient) return
		try {
			const { data } = await axios.delete(`/api/user/api-clients/${selectedClient.id}`)
			if (data.success) {
				toast.success(t('account.apiKeys.keyDeleted'))
				setDeleteModal(false)
				setSelectedClient(null)
				await fetchClients()
			}
		} catch (error) {
			console.error('Error deleting API client:', error)
			toast.error(t('account.apiKeys.deleteFailed'))
		}
	}

	const regenerateKeys = async () => {
		if (!selectedClient) return
		try {
			const { data } = await axios.post(`/api/user/api-clients/${selectedClient.id}/regenerate`)
			if (data.success) {
				toast.success(t('account.apiKeys.keysRegenerated'))
				setRegenerateModal(false)
				// Show the updated client with new keys
				setSelectedClient(data.data)
				setViewModal(true)
				await fetchClients()
			}
		} catch (error) {
			console.error('Error regenerating API keys:', error)
			toast.error('Failed to regenerate API keys')
		}
	}

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text)
			toast.success(t('account.apiKeys.keyCopied'))
		} catch (error) {
			console.error('Failed to copy:', error)
			toast.error('Failed to copy to clipboard')
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="flex items-center gap-3">
					<div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
					<span className="text-muted-foreground">{t('account.apiKeys.loading')}</span>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold text-foreground">{t('account.apiKeys.title')}</h3>
					<p className="text-sm text-muted-foreground mt-1">{t('account.apiKeys.description')}</p>
				</div>
				<div className="flex gap-2">
					<Button onClick={() => window.open('/docs.html', '_blank')} variant="outline" size="sm">
						{t('account.apiKeys.apiDocs')}
					</Button>
					<Button onClick={fetchClients} variant="outline" size="sm">
						<RefreshCw className="w-4 h-4 mr-2" />
						{t('account.apiKeys.refresh')}
					</Button>
					{canCreateApiKeys && (
						<Button onClick={() => setIsOpen(true)} size="sm">
							<Plus className="w-4 h-4 mr-2" />
							{t('account.apiKeys.addKey')}
						</Button>
					)}
				</div>
			</div>

			{/* Info Banner */}
			<div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
				<div className="flex items-start gap-3">
					<Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
					<div className="space-y-2">
						<h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
							{t('account.apiKeys.importantInfo.title')}
						</h4>
						<div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
							<p>{t('account.apiKeys.importantInfo.persistent')}</p>
							<p>{t('account.apiKeys.importantInfo.accessScope')}</p>
							<p>{t('account.apiKeys.importantInfo.security')}</p>
						</div>
					</div>
				</div>
			</div>

			{/* Search */}
			<div className="relative">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={t('account.apiKeys.searchPlaceholder')}
					className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			<div className="text-sm text-muted-foreground text-center">
				{t('account.apiKeys.totalKeys', { count: String(filteredClients.length) })}
			</div>

			{filteredClients.length === 0 ? (
				<div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
					<Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
					<h4 className="text-sm font-semibold text-foreground mb-2">{t('account.apiKeys.noKeys')}</h4>
					<p className="text-sm text-muted-foreground mb-4">{t('account.apiKeys.createFirst')}</p>
					{canCreateApiKeys && (
						<Button onClick={() => setIsOpen(true)} variant="outline">
							{t('account.apiKeys.addKey')}
						</Button>
					)}
				</div>
			) : (
				<div className="space-y-3">
					{filteredClients.map((client) => (
						<div key={client.id} className="rounded-lg border border-border bg-card p-4">
							<div className="flex items-start justify-between mb-3">
								<div className="flex-1">
									<h4 className="text-sm font-semibold text-foreground">{client.name}</h4>
									<p className="text-xs text-muted-foreground mt-1 font-mono truncate">
										{client.public_key ? client.public_key.substring(0, 20) + '...' : ''}
									</p>
									<p className="text-xs text-muted-foreground mt-2">
										{t('account.apiKeys.createdAt')}: {new Date(client.created_at).toLocaleDateString()}
									</p>
								</div>
								<div className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
									{t('account.apiKeys.statuses.active')}
								</div>
							</div>
							<div className="flex gap-2 flex-wrap">
								<Button variant="outline" size="sm" onClick={() => viewClient(client)}>
									<Eye className="w-4 h-4 mr-1" />
									{t('account.apiKeys.viewDetails')}
								</Button>
								<Button variant="outline" size="sm" onClick={() => editClient(client)}>
									<Pencil className="w-4 h-4 mr-1" />
									{t('account.apiKeys.edit')}
								</Button>
								<Button variant="outline" size="sm" onClick={() => { setSelectedClient(client); setRegenerateModal(true); }}>
									<RefreshCw className="w-4 h-4 mr-1" />
									{t('account.apiKeys.regenerateKeys')}
								</Button>
								<Button variant="destructive" size="sm" onClick={() => { setSelectedClient(client); setDeleteModal(true); }}>
									<Trash2 className="w-4 h-4 mr-1" />
									{t('account.apiKeys.delete')}
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Create/Edit Modal */}
			<Dialog open={isOpen || editModal} onClose={() => { setIsOpen(false); setEditModal(false); setClientName(''); }} className="relative z-50">
				<div className="fixed inset-0 bg-black/30" aria-hidden="true" />
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<DialogPanel className="w-full max-w-2xl rounded-xl bg-card border border-border p-6 shadow-xl">
						<DialogTitle className="text-lg font-semibold text-foreground mb-2">
							{editModal ? t('account.apiKeys.editKey') : t('account.apiKeys.addKey')}
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground mb-6">
							{t('account.apiKeys.modalDescription')}
						</DialogDescription>

						<Field>
							<Label className="text-sm font-medium text-foreground">{t('account.apiKeys.clientName')}</Label>
							<HeadlessInput
								value={clientName}
								onChange={(e) => setClientName(e.target.value)}
								placeholder={t('account.apiKeys.clientNamePlaceholder')}
								className={cn(
									'mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2',
									'text-sm text-foreground placeholder:text-muted-foreground',
									'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
								)}
							/>
						</Field>

						<div className="mt-6 flex gap-3">
							<Button onClick={editModal ? handleEditClient : handleCreateClient} className="flex-1">
								{editModal ? t('account.apiKeys.updateKey') : t('account.apiKeys.addKey')}
							</Button>
							<Button onClick={() => { setIsOpen(false); setEditModal(false); setClientName(''); }} variant="outline" className="flex-1">
								{t('common.cancel')}
							</Button>
						</div>
					</DialogPanel>
				</div>
			</Dialog>

			{/* View Modal */}
			<Dialog open={viewModal} onClose={() => setViewModal(false)} className="relative z-50">
				<div className="fixed inset-0 bg-black/30" aria-hidden="true" />
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<DialogPanel className="w-full max-w-2xl rounded-xl bg-card border border-border p-6 shadow-xl">
						<DialogTitle className="text-lg font-semibold text-foreground mb-4">{selectedClient?.name}</DialogTitle>
						{selectedClient && (
							<div className="space-y-4">
								<div>
									<span className="text-sm font-medium text-muted-foreground">{t('account.apiKeys.publicKey')}:</span>
									<div className="mt-2 p-3 bg-muted rounded-md">
										<pre className="text-xs font-mono break-all whitespace-pre-wrap">{selectedClient.public_key}</pre>
										<Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(selectedClient.public_key || '')}>
											<Copy className="w-4 h-4 mr-1" />
											{t('account.apiKeys.copyKey')}
										</Button>
									</div>
								</div>
								{selectedClient.private_key && (
									<div>
										<span className="text-sm font-medium text-muted-foreground">{t('account.apiKeys.privateKey')}:</span>
										<div className="mt-2 p-3 bg-muted rounded-md">
											<pre className="text-xs font-mono break-all whitespace-pre-wrap custom-scrollbar max-h-64 overflow-auto">{selectedClient.private_key}</pre>
											<Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(selectedClient.private_key || '')}>
												<Copy className="w-4 h-4 mr-1" />
												{t('account.apiKeys.copyKey')}
											</Button>
											<p className="text-xs text-yellow-600 mt-2">{t('account.apiKeys.privateKeyWarning')}</p>
										</div>
									</div>
								)}
							</div>
						)}
					</DialogPanel>
				</div>
			</Dialog>

			{/* Delete Modal */}
			<Dialog open={deleteModal} onClose={() => setDeleteModal(false)} className="relative z-50">
				<div className="fixed inset-0 bg-black/30" aria-hidden="true" />
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<DialogPanel className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl">
						<DialogTitle className="text-lg font-semibold text-foreground mb-2">
							{t('account.apiKeys.confirmDelete')}
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground mb-6">
							{t('account.apiKeys.deleteWarning')}
						</DialogDescription>
						<div className="flex gap-3">
							<Button onClick={deleteClient} variant="destructive" className="flex-1">
								{t('account.apiKeys.confirmDelete')}
							</Button>
							<Button onClick={() => setDeleteModal(false)} variant="outline" className="flex-1">
								{t('common.cancel')}
							</Button>
						</div>
					</DialogPanel>
				</div>
			</Dialog>

			{/* Regenerate Modal */}
			<Dialog open={regenerateModal} onClose={() => setRegenerateModal(false)} className="relative z-50">
				<div className="fixed inset-0 bg-black/30" aria-hidden="true" />
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<DialogPanel className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl">
						<DialogTitle className="text-lg font-semibold text-foreground mb-2">
							{t('account.apiKeys.confirmRegenerate')}
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground mb-6">
							{t('account.apiKeys.regenerateWarning')}
						</DialogDescription>
						<div className="flex gap-3">
							<Button onClick={regenerateKeys} className="flex-1">
								{t('account.apiKeys.confirmRegenerate')}
							</Button>
							<Button onClick={() => setRegenerateModal(false)} variant="outline" className="flex-1">
								{t('common.cancel')}
							</Button>
						</div>
					</DialogPanel>
				</div>
			</Dialog>
		</div>
	)
}
