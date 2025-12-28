import { MegaphoneIcon, TicketIcon } from '@heroicons/react/24/outline'

interface ComingSoonCardProps {
	t: (key: string) => string
}

export function ComingSoonCard({ t }: ComingSoonCardProps) {
	return (
		<div className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden relative group">
			<div className="flex items-center justify-between mb-4 relative z-10">
				<h2 className="text-lg font-bold">{t('dashboard.coming_soon.title')}</h2>
				<span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg uppercase tracking-wider">
					Soon
				</span>
			</div>

			<div className="space-y-4 relative z-10">
				<div className="flex items-center gap-3 text-muted-foreground/80">
					<div className="p-2 rounded-lg bg-muted">
						<TicketIcon className="h-5 w-5" />
					</div>
					<span className="font-medium">{t('dashboard.coming_soon.tickets')}</span>
				</div>
				<div className="flex items-center gap-3 text-muted-foreground/80">
					<div className="p-2 rounded-lg bg-muted">
						<MegaphoneIcon className="h-5 w-5" />
					</div>
					<span className="font-medium">{t('dashboard.coming_soon.announcements')}</span>
				</div>
				<p className="text-sm text-muted-foreground pt-2">
					{t('dashboard.coming_soon.description')}
				</p>
			</div>

			{/* Decorative gradient */}
			<div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl transition-all duration-500 group-hover:bg-primary/10" />
		</div>
	)
}
