import { ClockIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
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
						<div className="flex-1 space-y-2 pb-4">
							<div className="flex items-start justify-between gap-2">
								<div className="flex-1">
									<h4 className="text-sm font-medium text-foreground">{activity.name}</h4>
									{activity.context && (
										<p className="text-sm text-muted-foreground mt-1">{activity.context}</p>
									)}
								</div>
								<div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
									<ClockIcon className="h-3 w-3" />
									{formatDate(activity.created_at)}
								</div>
							</div>

							{activity.ip_address && (
								<div className="flex items-center gap-1 text-xs text-muted-foreground">
									<GlobeAltIcon className="h-3 w-3" />
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
