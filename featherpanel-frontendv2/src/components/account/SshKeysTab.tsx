'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { Dialog, DialogPanel, DialogTitle, Description as DialogDescription, Field, Label, Input as HeadlessInput } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Key, Plus, Trash2, Eye, Pencil, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'

interface SshKey {
	id: number
	user_id: number
	name: string
	public_key?: string
	fingerprint?: string
	created_at: string
	updated_at: string
	deleted_at: string | null
}

export default function SshKeysTab() {
	const { t } = useTranslation()
	const [keys, setKeys] = useState<SshKey[]>([])
	const [loading, setLoading] = useState(true)
	const [isOpen, setIsOpen] = useState(false)
	const [viewModal, setViewModal] = useState(false)
	const [editModal, setEditModal] = useState(false)
	const [deleteModal, setDeleteModal] = useState(false)
	const [selectedKey, setSelectedKey] = useState<SshKey | null>(null)
	const [newKeyName, setNewKeyName] = useState('')
	const [newKeyPublic, setNewKeyPublic] = useState('')
	const [searchQuery, setSearchQuery] = useState('')

	const fetchKeys = async () => {
		setLoading(true)
		try {
			const { data } = await axios.get('/api/user/ssh-keys')
			if (data.success) {
				setKeys(data.data.ssh_keys || [])
			}
		} catch (error) {
			console.error('Error fetching SSH keys:', error)
			const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } }
			toast.error(axiosError.response?.data?.error_message || axiosError.response?.data?.message || t('account.sshKeys.loadError'))
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchKeys()
	}, [])

	const filteredKeys = keys.filter(key =>
		key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		key.fingerprint?.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const handleAddKey = async () => {
		try {
			const { data } = await axios.post('/api/user/ssh-keys', {
				name: newKeyName,
				public_key: newKeyPublic,
			})
			if (data.success) {
				toast.success(t('account.sshKeys.keyAdded'))
				setIsOpen(false)
				setNewKeyName('')
				setNewKeyPublic('')
				await fetchKeys()
			}
		} catch (error) {
			console.error('Error adding SSH key:', error)
			const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } }
			toast.error(axiosError.response?.data?.error_message || axiosError.response?.data?.message || t('account.sshKeys.addFailed'))
		}
	}

	const handleEditKey = async () => {
		if (!selectedKey) return
		try {
			const { data } = await axios.put(`/api/user/ssh-keys/${selectedKey.id}`, {
				name: newKeyName,
				public_key: newKeyPublic,
			})
			if (data.success) {
				toast.success(t('account.sshKeys.keyUpdated'))
				setEditModal(false)
				setSelectedKey(null)
				setNewKeyName('')
				setNewKeyPublic('')
				await fetchKeys()
			}
		} catch (error) {
			console.error('Error updating SSH key:', error)
			const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } }
			toast.error(axiosError.response?.data?.error_message || axiosError.response?.data?.message || t('account.sshKeys.updateFailed'))
		}
	}

	const viewKey = async (key: SshKey) => {
		try {
			const { data } = await axios.get(`/api/user/ssh-keys/${key.id}`)
			if (data.success) {
				setSelectedKey(data.data)
				setViewModal(true)
			}
		} catch (error) {
			console.error('Error loading SSH key:', error)
			const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } }
			toast.error(axiosError.response?.data?.error_message || axiosError.response?.data?.message || t('account.sshKeys.loadSingleError'))
		}
	}

	const editKey = async (key: SshKey) => {
		try {
			const { data } = await axios.get(`/api/user/ssh-keys/${key.id}`)
			if (data.success) {
				setSelectedKey(data.data)
				setNewKeyName(data.data.name)
				setNewKeyPublic(data.data.public_key || '')
				setEditModal(true)
			}
		} catch (error) {
			console.error('Error loading SSH key:', error)
			toast.error(t('account.sshKeys.loadSingleError'))
		}
	}

	const deleteKey = async () => {
		if (!selectedKey) return
		try {
			const endpoint = selectedKey.deleted_at
				? `/api/user/ssh-keys/${selectedKey.id}/hard-delete`
				: `/api/user/ssh-keys/${selectedKey.id}`
			const { data } = await axios.delete(endpoint)
			if (data.success) {
				toast.success(selectedKey.deleted_at ? t('account.sshKeys.keyPermanentlyDeleted') : t('account.sshKeys.keyDeleted'))
				setDeleteModal(false)
				setSelectedKey(null)
				await fetchKeys()
			}
		} catch (error) {
			console.error('Error deleting SSH key:', error)
			const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } }
			toast.error(axiosError.response?.data?.error_message || axiosError.response?.data?.message || t('account.sshKeys.deleteFailed'))
		}
	}

	const restoreKey = async (key: SshKey) => {
		try {
			const { data } = await axios.post(`/api/user/ssh-keys/${key.id}/restore`)
			if (data.success) {
				toast.success(t('account.sshKeys.keyRestored'))
				await fetchKeys()
			}
		} catch (error) {
			console.error('Error restoring SSH key:', error)
			const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } }
			toast.error(axiosError.response?.data?.error_message || axiosError.response?.data?.message || t('account.sshKeys.loadSingleError'))
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="flex items-center gap-3">
					<div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
					<span className="text-muted-foreground">{t('account.sshKeys.loading')}</span>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold text-foreground">{t('account.sshKeys.title')}</h3>
					<p className="text-sm text-muted-foreground mt-1">{t('account.sshKeys.description')}</p>
				</div>
				<div className="flex gap-2">
					<Button onClick={fetchKeys} variant="outline" size="sm">
						<RefreshCw className="w-4 h-4 mr-2" />
						{t('account.sshKeys.refresh')}
					</Button>
					<Button onClick={() => setIsOpen(true)} size="sm">
						<Plus className="w-4 h-4 mr-2" />
						{t('account.sshKeys.addKey')}
					</Button>
				</div>
			</div>

			{/* Search */}
			<div className="relative">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={t('account.sshKeys.searchPlaceholder')}
					className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			<div className="text-sm text-muted-foreground text-center">
				{t('account.sshKeys.totalKeys', { count: String(filteredKeys.length) })}
			</div>

			{filteredKeys.length === 0 ? (
				<div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
					<Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
					<h4 className="text-sm font-semibold text-foreground mb-2">{t('account.sshKeys.noKeys')}</h4>
					<p className="text-sm text-muted-foreground mb-4">{t('account.sshKeys.createFirst')}</p>
					<Button onClick={() => setIsOpen(true)} variant="outline">
						{t('account.sshKeys.addKey')}
					</Button>
				</div>
			) : (
				<div className="space-y-3">
					{filteredKeys.map((key) => (
						<div key={key.id} className="rounded-lg border border-border bg-card p-4">
							<div className="flex items-start justify-between mb-3">
								<div className="flex-1">
									<h4 className="text-sm font-semibold text-foreground">{key.name}</h4>
									<p className="text-xs text-muted-foreground mt-1 font-mono truncate">
										{key.fingerprint || t('common.unknown')}
									</p>
									<p className="text-xs text-muted-foreground mt-2">
										{t('account.sshKeys.createdAt')}: {new Date(key.created_at).toLocaleDateString()}
									</p>
								</div>
								<div className={cn(
									"px-2 py-1 rounded text-xs font-medium",
									key.deleted_at ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-green-200" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
								)}>
									{key.deleted_at ? t('account.sshKeys.statuses.deleted') : t('account.sshKeys.statuses.active')}
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" onClick={() => viewKey(key)}>
									<Eye className="w-4 h-4 mr-1" />
									{t('account.sshKeys.viewDetails')}
								</Button>
								<Button variant="outline" size="sm" onClick={() => editKey(key)}>
									<Pencil className="w-4 h-4 mr-1" />
									{t('account.sshKeys.edit')}
								</Button>
								{key.deleted_at ? (
									<Button variant="outline" size="sm" onClick={() => restoreKey(key)}>
										{t('account.sshKeys.restore')}
									</Button>
								) : null}
								<Button variant="destructive" size="sm" onClick={() => { setSelectedKey(key); setDeleteModal(true); }}>
									<Trash2 className="w-4 h-4 mr-1" />
									{key.deleted_at ? t('account.sshKeys.permanentlyDelete') : t('account.sshKeys.delete')}
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Add/Edit Modal */}
			<Dialog open={isOpen || editModal} onClose={() => { setIsOpen(false); setEditModal(false); setNewKeyName(''); setNewKeyPublic(''); }} className="relative z-50">
				<div className="fixed inset-0 bg-black/30" aria-hidden="true" />
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<DialogPanel className="w-full max-w-2xl rounded-xl bg-card border border-border p-6 shadow-xl">
						<DialogTitle className="text-lg font-semibold text-foreground mb-2">
							{editModal ? t('account.sshKeys.editKey') : t('account.sshKeys.addKey')}
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground mb-6">
							{t('account.sshKeys.modalDescription')}
						</DialogDescription>

						<div className="space-y-4">
							<Field>
								<Label className="text-sm font-medium text-foreground">{t('account.sshKeys.keyName')}</Label>
								<HeadlessInput
									value={newKeyName}
									onChange={(e) => setNewKeyName(e.target.value)}
									placeholder={t('account.sshKeys.keyNamePlaceholder')}
									className={cn(
										'mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2',
										'text-sm text-foreground placeholder:text-muted-foreground',
										'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
									)}
								/>
							</Field>

							<Field>
								<Label className="text-sm font-medium text-foreground">{t('account.sshKeys.publicKey')}</Label>
								<textarea
									value={newKeyPublic}
									onChange={(e) => setNewKeyPublic(e.target.value)}
									placeholder={t('account.sshKeys.publicKeyHint')}
									rows={8}
									className={cn(
										'mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2',
										'text-sm text-foreground placeholder:text-muted-foreground font-mono',
										'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none custom-scrollbar'
									)}
								/>
							</Field>
						</div>

						<div className="mt-6 flex gap-3">
							<Button onClick={editModal ? handleEditKey : handleAddKey} className="flex-1">
								{editModal ? t('account.sshKeys.updateKey') : t('account.sshKeys.addKey')}
							</Button>
							<Button onClick={() => { setIsOpen(false); setEditModal(false); setNewKeyName(''); setNewKeyPublic(''); }} variant="outline" className="flex-1">
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
						<DialogTitle className="text-lg font-semibold text-foreground mb-4">{selectedKey?.name}</DialogTitle>
						{selectedKey && (
							<div className="space-y-4">
								<div>
									<span className="text-sm font-medium text-muted-foreground">{t('account.sshKeys.fingerprint')}:</span>
									<p className="mt-1 text-sm font-mono break-all">{selectedKey.fingerprint}</p>
								</div>
								<div>
									<span className="text-sm font-medium text-muted-foreground">{t('account.sshKeys.publicKey')}:</span>
									<div className="mt-2 p-3 bg-muted rounded-md custom-scrollbar overflow-auto max-h-64">
										<pre className="text-xs font-mono break-all whitespace-pre-wrap">{selectedKey.public_key}</pre>
									</div>
								</div>
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
							{t('account.sshKeys.confirmDelete')}
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground mb-6">
							{t('account.sshKeys.deleteWarning')}
						</DialogDescription>
						<div className="flex gap-3">
							<Button onClick={deleteKey} variant="destructive" className="flex-1">
								{t('account.sshKeys.confirmDelete')}
							</Button>
							<Button onClick={() => setDeleteModal(false)} variant="outline" className="flex-1">
								{t('common.cancel')}
							</Button>
						</div>
					</DialogPanel>
				</div>
			</Dialog>
		</div>
	)
}
