'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import axios from 'axios'
import type { Notification, NotificationsResponse } from '@/types/notification'

interface NotificationContextType {
	notifications: Notification[]
	loading: boolean
	dismissNotification: (id: number) => void
	refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [dismissedIds, setDismissedIds] = useState<number[]>([])
	const [loading, setLoading] = useState(true)

	// Load dismissed IDs from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem('featherpanel_dismissed_notifications')
		if (stored) {
			try {
				setDismissedIds(JSON.parse(stored))
			} catch (e) {
				console.error('Failed to parse dismissed notifications', e)
			}
		}
	}, [])

	// Save dismissed IDs to localStorage whenever they change
	useEffect(() => {
		if (dismissedIds.length > 0) {
			localStorage.setItem('featherpanel_dismissed_notifications', JSON.stringify(dismissedIds))
		}
	}, [dismissedIds])

	const fetchNotifications = useCallback(async () => {
		try {
			const { data } = await axios.get<NotificationsResponse>('/api/user/notifications')
			if (data.success && data.data?.notifications) {
				setNotifications(data.data.notifications)
			}
		} catch (error) {
			console.error('Failed to fetch notifications', error)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchNotifications()
		// Poll every 5 minutes
		const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
		return () => clearInterval(interval)
	}, [fetchNotifications])

	const dismissNotification = useCallback((id: number) => {
		setDismissedIds(prev => {
			const next = [...prev, id]
			return next
		})
	}, [])

	// Filter out dismissed notifications (unless they are sticky, which shouldn't be dismissible anyway,
	// but if a sticky one was somehow dismissed, we might want to respect it or ignore it.
	// Logic: Sticky notifications usually cannot be dismissed by UI.
	// If the UI allows dismissal of non-sticky only, we just filter by ID.
	const activeNotifications = notifications.filter(n => !dismissedIds.includes(n.id))

	return (
		<NotificationContext.Provider value={{
			notifications: activeNotifications,
			loading,
			dismissNotification,
			refreshNotifications: fetchNotifications
		}}>
			{children}
		</NotificationContext.Provider>
	)
}

export function useNotifications() {
	const context = useContext(NotificationContext)
	if (context === undefined) {
		throw new Error('useNotifications must be used within a NotificationProvider')
	}
	return context
}
