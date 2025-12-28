export interface Notification {
	id: number
	user_id: number | null
	title: string
	message_markdown: string
	type: 'info' | 'success' | 'warning' | 'error' | 'danger'
	is_dismissible: boolean
	is_sticky: boolean
	created_at: string
	updated_at: string | null
}

export interface NotificationsResponse {
	success: boolean
	message: string
	data: {
		notifications: Notification[]
	}
	error: boolean
	error_message: string | null
	error_code: string | null
}
