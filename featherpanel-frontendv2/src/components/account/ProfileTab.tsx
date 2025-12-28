'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { useSession } from '@/contexts/SessionContext'
import { useSettings } from '@/contexts/SettingsContext'
import { Description, Field, Fieldset, Input as HeadlessInput, Label, Textarea as HeadlessTextarea } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import axios from 'axios'
import { toast } from 'sonner'
import Turnstile from 'react-turnstile'
import { cn } from '@/lib/utils'

interface FormData {
	username: string
	email: string
	first_name: string
	last_name: string
	password: string
	avatar: string
	ticket_signature: string
}

export default function ProfileTab() {
	const { t } = useTranslation()
	const { user, fetchSession } = useSession()
	const { settings } = useSettings()

	const [formData, setFormData] = useState<FormData>({
		username: '',
		email: '',
		first_name: '',
		last_name: '',
		password: '',
		avatar: '',
		ticket_signature: '',
	})

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [loading, setLoading] = useState(true)
	const [avatarFile, setAvatarFile] = useState<File | null>(null)
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
	const [turnstileToken, setTurnstileToken] = useState('')
	const [turnstileKey, setTurnstileKey] = useState(0)

	// Permission checks from settings
	const allowAvatarChange = settings?.user_allow_avatar_change ?? true
	const allowUsernameChange = settings?.user_allow_username_change ?? true
	const allowEmailChange = settings?.user_allow_email_change ?? true
	const allowFirstNameChange = settings?.user_allow_first_name_change ?? true
	const allowLastNameChange = settings?.user_allow_last_name_change ?? true

	// Initialize form with user data
	useEffect(() => {
		if (user) {
			setFormData({
				username: user.username || '',
				email: user.email || '',
				first_name: user.first_name || '',
				last_name: user.last_name || '',
				password: '',
				avatar: user.avatar || '',
				ticket_signature: user.ticket_signature || '',
			})
			setLoading(false)
		}
	}, [user])

	const resetForm = () => {
		if (user) {
			setFormData({
				username: user.username || '',
				email: user.email || '',
				first_name: user.first_name || '',
				last_name: user.last_name || '',
				password: '',
				avatar: user.avatar || '',
				ticket_signature: user.ticket_signature || '',
			})
		}
		setAvatarFile(null)
		resetTurnstile()
	}

	const resetTurnstile = () => {
		if (settings?.turnstile_enabled) {
			setTurnstileToken('')
			setTurnstileKey(prev => prev + 1)
		}
	}

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			setAvatarFile(file)
			const reader = new FileReader()
			reader.onloadend = () => {
				setFormData(prev => ({ ...prev, avatar: reader.result as string }))
			}
			reader.readAsDataURL(file)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		try {
			if (settings?.turnstile_enabled && !turnstileToken) {
				toast.error('Please complete the CAPTCHA verification')
				return
			}

			setIsSubmitting(true)

			const submitData: Record<string, string> = {}

			if (allowUsernameChange && formData.username !== (user?.username || '')) {
				submitData.username = formData.username
			}

			if (allowFirstNameChange && formData.first_name !== (user?.first_name || '')) {
				submitData.first_name = formData.first_name
			}

			if (allowLastNameChange && formData.last_name !== (user?.last_name || '')) {
				submitData.last_name = formData.last_name
			}

			if (allowEmailChange && formData.email !== (user?.email || '')) {
				submitData.email = formData.email
			}

			if (allowAvatarChange && avatarFile) {
				setIsUploadingAvatar(true)
				try {
					const formDataUpload = new FormData()
					formDataUpload.append('avatar', avatarFile)

					const uploadResponse = await axios.post('/api/user/avatar', formDataUpload, {
						headers: { 'Content-Type': 'multipart/form-data' },
					})

					if (uploadResponse.data.success) {
						submitData.avatar = uploadResponse.data.data.avatar_url
					} else {
						toast.error(uploadResponse.data.message || t('account.avatarUploadFailed'))
						resetTurnstile()
						return
					}
				} finally {
					setIsUploadingAvatar(false)
				}
			}

			if (formData.password && formData.password.trim() !== '') {
				submitData.password = formData.password
			}

			if (formData.ticket_signature !== (user?.ticket_signature || '')) {
				submitData.ticket_signature = formData.ticket_signature
			}

			if (settings?.turnstile_enabled) {
				submitData.turnstile_token = turnstileToken
			}

			const changedKeys = Object.keys(submitData).filter(key => key !== 'turnstile_token')
			if (changedKeys.length === 0) {
				toast.info(t('account.noChanges'))
				resetTurnstile()
				return
			}

			const response = await axios.patch('/api/user/session', submitData)

			if (response.data.success) {
				await fetchSession(true)
				toast.success(t('account.profileUpdated'))
				setFormData(prev => ({ ...prev, password: '' }))
				setAvatarFile(null)
			} else {
				toast.error(response.data.message || t('account.updateFailed'))
				resetTurnstile()
			}
		} catch (error) {
			console.error('Error updating profile:', error)
			const axiosError = error as { response?: { data?: { message?: string } } }
			toast.error(axiosError.response?.data?.message || t('account.unexpectedError'))
			resetTurnstile()
		} finally {
			setIsSubmitting(false)
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="flex items-center gap-3">
					<div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
					<span className="text-muted-foreground">{t('account.loadingProfile')}</span>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold text-foreground">{t('account.editProfile')}</h3>
				<p className="text-sm text-muted-foreground mt-1">{t('account.editProfileDescription')}</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<Fieldset className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{allowUsernameChange && (
							<Field>
								<Label className="text-sm font-medium text-foreground">{t('account.username')}</Label>
								<HeadlessInput
									value={formData.username}
									onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
									disabled={isSubmitting}
									placeholder={t('account.usernamePlaceholder')}
									className={cn(
										'mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2',
										'text-sm text-foreground placeholder:text-muted-foreground',
										'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
										'disabled:opacity-50 disabled:cursor-not-allowed'
									)}
								/>
							</Field>
						)}

						{allowEmailChange && (
							<Field>
								<Label className="text-sm font-medium text-foreground">{t('account.email')}</Label>
								<HeadlessInput
									type="email"
									value={formData.email}
									onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
									disabled={isSubmitting}
									placeholder={t('account.emailPlaceholder')}
									className={cn(
										'mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2',
										'text-sm text-foreground placeholder:text-muted-foreground',
										'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
										'disabled:opacity-50 disabled:cursor-not-allowed'
									)}
								/>
							</Field>
						)}

						{allowFirstNameChange && (
							<Field>
								<Label className="text-sm font-medium text-foreground">{t('account.firstName')}</Label>
								<HeadlessInput
									value={formData.first_name}
									onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
									disabled={isSubmitting}
									placeholder={t('account.firstNamePlaceholder')}
									className={cn(
										'mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2',
										'text-sm text-foreground placeholder:text-muted-foreground',
										'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
										'disabled:opacity-50 disabled:cursor-not-allowed'
									)}
								/>
							</Field>
						)}

						{allowLastNameChange && (
							<Field>
								<Label className="text-sm font-medium text-foreground">{t('account.lastName')}</Label>
								<HeadlessInput
									value={formData.last_name}
									onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
									disabled={isSubmitting}
									placeholder={t('account.lastNamePlaceholder')}
									className={cn(
										'mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2',
										'text-sm text-foreground placeholder:text-muted-foreground',
										'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
										'disabled:opacity-50 disabled:cursor-not-allowed'
									)}
								/>
							</Field>
						)}

						{allowAvatarChange && (
							<Field>
								<Label className="text-sm font-medium text-foreground">{t('account.avatar')}</Label>
								<input
									type="file"
									accept="image/*"
									onChange={handleAvatarChange}
									disabled={isSubmitting || isUploadingAvatar}
									className={cn(
										'mt-2 block w-full text-sm text-foreground',
										'file:mr-4 file:py-2 file:px-4',
										'file:rounded-lg file:border-0',
										'file:text-sm file:font-semibold',
										'file:bg-primary file:text-primary-foreground',
										'hover:file:bg-primary/90',
										'file:cursor-pointer cursor-pointer',
										'disabled:opacity-50 disabled:cursor-not-allowed'
									)}
								/>
								{formData.avatar && (
									<div className="mt-3">
										<img
											src={formData.avatar}
											alt="Avatar preview"
											className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
										/>
									</div>
								)}
							</Field>
						)}

						<Field>
							<Label className="text-sm font-medium text-foreground">{t('account.newPassword')}</Label>
							<HeadlessInput
								type="password"
								value={formData.password}
								onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
								disabled={isSubmitting}
								placeholder={t('account.passwordPlaceholder')}
								className={cn(
									'mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2',
									'text-sm text-foreground placeholder:text-muted-foreground',
									'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
									'disabled:opacity-50 disabled:cursor-not-allowed'
								)}
							/>
							<Description className="text-xs text-muted-foreground mt-1">
								{t('account.passwordHint')}
							</Description>
						</Field>
					</div>

					<Field>
						<Label className="text-sm font-medium text-foreground">{t('account.ticketSignature')}</Label>
						<HeadlessTextarea
							value={formData.ticket_signature}
							onChange={(e) => setFormData(prev => ({ ...prev, ticket_signature: e.target.value }))}
							disabled={isSubmitting}
							placeholder={t('account.ticketSignaturePlaceholder')}
							rows={4}
							className={cn(
								'mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2',
								'text-sm text-foreground placeholder:text-muted-foreground font-mono',
								'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
								'disabled:opacity-50 disabled:cursor-not-allowed resize-none custom-scrollbar'
							)}
						/>
						<Description className="text-xs text-muted-foreground mt-1">
							{t('account.ticketSignatureHint')}
						</Description>
					</Field>
				</Fieldset>

				<div className="space-y-4 pt-4 border-t border-border">
					{settings?.turnstile_enabled && settings?.turnstile_key_pub && (
						<div className="flex justify-start">
							<Turnstile
								key={turnstileKey}
								sitekey={settings.turnstile_key_pub}
								onSuccess={(token) => setTurnstileToken(token)}
							/>
						</div>
					)}

					<div className="flex gap-3">
						<Button
							type="submit"
							disabled={isSubmitting || isUploadingAvatar}
							className="min-w-[120px]"
						>
							{isSubmitting ? t('account.saving') : t('account.saveChanges')}
						</Button>

						<Button
							type="button"
							variant="outline"
							disabled={isSubmitting}
							onClick={resetForm}
						>
							{t('account.reset')}
						</Button>
					</div>
				</div>
			</form>
		</div>
	)
}
