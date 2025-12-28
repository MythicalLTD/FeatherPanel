import { Ticket, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface TicketListProps {
	t: (key: string) => string
}

export function TicketList({ t }: TicketListProps) {
	// Sample data
	const tickets = [
		{
			id: 1234,
			subject: 'Server keeps crashing on startup',
			status: 'open',
			last_updated: '2025-12-28T10:30:00',
			category: 'Technical'
		},
		{
			id: 1233,
			subject: 'Billing question regarding upgrades',
			status: 'answered',
			last_updated: '2025-12-27T15:45:00',
			category: 'Billing'
		}
	]

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'open': return 'bg-green-500/10 text-green-600 dark:text-green-400'
			case 'answered': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
			case 'closed': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
			default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
		}
	}

	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			<div className="flex items-center justify-between p-6 border-b border-border">
				<div className="flex items-center gap-2">
					<Ticket className="h-5 w-5 text-muted-foreground" />
					<h2 className="text-lg font-bold">{t('dashboard.tickets.title')}</h2>
				</div>
				<Link href="/tickets" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
					{t('dashboard.tickets.view_all')} &rarr;
				</Link>
			</div>

			<div className="divide-y divide-border">
				{tickets.length > 0 ? (
					tickets.map((ticket) => (
						<div key={ticket.id} className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
							<div className="flex items-start gap-4">
								<div className="p-2 rounded-full bg-primary/5 text-primary shrink-0">
									<MessageSquare className="h-5 w-5" />
								</div>
								<div>
									<h4 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">
										{ticket.subject}
									</h4>
									<div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
										<span className="font-mono">#{ticket.id}</span>
										<span className="hidden sm:inline">•</span>
										<span>{ticket.category}</span>
										<span className="hidden sm:inline">•</span>
										<span>{new Date(ticket.last_updated).toLocaleDateString()}</span>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-4 pl-11 sm:pl-0">
								<span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(ticket.status)}`}>
									{ticket.status}
								</span>
							</div>
						</div>
					))
				) : (
					<div className="p-8 text-center text-muted-foreground">
						<Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
						<p>{t('dashboard.tickets.no_tickets')}</p>
					</div>
				)}
			</div>
		</div>
	)
}
