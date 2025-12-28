import { Clock, Globe } from 'lucide-react'
import type { Activity } from '@/types/activity'

interface ActivityFeedProps {
	activities: Activity[]
	formatDate: (dateString: string) => string
}

export function ActivityFeed({ activities, formatDate }: ActivityFeedProps) {
	return (
		<div className="relative">
			{/* Timeline line */}
			<div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

			<div className="space-y-4">
				{activities.map((activity) => (
					<div key={activity.id} className="relative flex gap-4">
						{/* Timeline dot */}
						<div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 bg-card">
							<div className="h-3 w-3 rounded-full bg-primary"></div>
						</div>

						{/* Activity content */}
						<div className="flex-1 space-y-2 pb-4 min-w-0">
							<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2">
								<div className="flex-1 min-w-0">
									<h4 className="text-sm font-medium text-foreground break-words">{activity.name}</h4>
									{activity.context && (
										<p className="text-sm text-muted-foreground mt-0.5 break-words">{activity.context}</p>
									)}
								</div>
								<div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-1 sm:mt-0">
									<Clock className="h-3 w-3" />
									{formatDate(activity.created_at)}
								</div>
							</div>

							{activity.ip_address && (
								<div className="flex items-center gap-1 text-xs text-muted-foreground">
									<Globe className="h-3 w-3" />
									<span className="font-mono">{activity.ip_address}</span>
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
