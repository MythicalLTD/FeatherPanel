/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { cn } from '@/lib/utils'
import { getStatusDotColor } from '@/lib/server-utils'

interface StatusBadgeProps {
	status: string
	t?: (key: string) => string
}

export function StatusBadge({ status, t }: StatusBadgeProps) {
	const colors = {
		running: 'bg-green-500/10 text-green-600 border-green-500/20',
		stopped: 'bg-red-500/10 text-red-600 border-red-500/20',
		starting: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
		stopping: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
	}

	const displayStatus = t ? t(`servers.status.${status}`) : status

	return (
		<span className={cn(
			'inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full border',
			colors[status as keyof typeof colors] || colors.stopped
		)}>
			<span className={cn('h-2 w-2 rounded-full', getStatusDotColor(status).replace('bg-', 'bg-'))} />
			{displayStatus}
		</span>
	)
}
