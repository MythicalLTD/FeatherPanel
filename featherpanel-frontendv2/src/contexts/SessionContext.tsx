'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import PermissionsClass from '@/lib/permissions'

export interface UserInfo {
	id: number
	username: string
	first_name: string
	last_name: string
	email: string
	role_id?: number
	role?: {
		name: string
		display_name: string
		color: string
	}
	avatar: string
	uuid: string
	two_fa_enabled: string
	last_seen: string
	first_seen: string
	ticket_signature?: string
	discord_oauth2_linked?: string
	discord_oauth2_name?: string
}

export type PermissionsList = string[]

interface SessionContextType {
	user: UserInfo | null
	permissions: PermissionsList
	isLoading: boolean
	isSessionChecked: boolean
	fetchSession: (force?: boolean) => Promise<boolean>
	refreshSession: () => Promise<boolean>
	clearSession: () => void
	logout: () => Promise<void>
	hasPermission: (permission: string) => boolean
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<UserInfo | null>(null)
	const [permissions, setPermissions] = useState<PermissionsList>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSessionChecked, setIsSessionChecked] = useState(false)
	const router = useRouter()

	const fetchSession = async (force = false): Promise<boolean> => {
		// Prevent multiple simultaneous fetches (unless forced)
		if (!force && isSessionChecked && user) {
			return true
		}

		try {
			const res = await axios.get('/api/user/session')
			if (res.data && res.data.success && res.data.data && res.data.data.user_info) {
				setUser(res.data.data.user_info as UserInfo)
				setPermissions(res.data.data.permissions as PermissionsList)
				setIsSessionChecked(true)
				setIsLoading(false)
				return true
			} else {
				setIsSessionChecked(true)
				setIsLoading(false)
				return false
			}
		} catch {
			setIsSessionChecked(true)
			setIsLoading(false)
			return false
		}
	}

	const refreshSession = async (): Promise<boolean> => {
		setIsSessionChecked(false)
		return await fetchSession(true)
	}

	const clearSession = () => {
		setUser(null)
		setIsSessionChecked(false)
		setPermissions([])
	}

	const logout = async () => {
		try {
			clearSession()
		} catch (error) {
			console.error('Error during logout:', error)
		} finally {
			router.push('/auth/logout')
		}
	}

	const hasPermission = (permission: string): boolean => {
		if (!permissions) return false
		if (permissions.includes(PermissionsClass.ADMIN_ROOT)) return true
		return permissions.includes(permission)
	}

	// Auto-fetch session on mount
	useEffect(() => {

		fetchSession()
	}, [])

	return (
		<SessionContext.Provider
			value={{
				user,
				permissions,
				isLoading,
				isSessionChecked,
				fetchSession,
				refreshSession,
				clearSession,
				logout,
				hasPermission,
			}}
		>
			{children}
		</SessionContext.Provider>
	)
}

export function useSession() {
	const context = useContext(SessionContext)
	if (!context) {
		throw new Error('useSession must be used within SessionProvider')
	}
	return context
}
