import { Server } from 'lucide-react'

interface EmptyStateProps {
	searchQuery: string
	t: (key: string) => string
}

export function EmptyState({ searchQuery, t }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-24 text-center">
			<Server className="h-20 w-20 text-muted-foreground/30 mb-6" />
			<h3 className="text-2xl font-bold mb-2">{t('servers.noServersFound')}</h3>
			<p className="text-muted-foreground max-w-md">
				{searchQuery
					? t('servers.adjustFilters')
					: t('servers.getStarted')}
			</p>
		</div>
	)
}
