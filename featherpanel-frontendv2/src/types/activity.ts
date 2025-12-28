export interface Activity {
  id: number
  user_uuid: string
  name: string
  context?: string
  ip_address?: string
  created_at: string
  updated_at: string
}

export interface DateFormatter {
  (dateString: string): string
}
