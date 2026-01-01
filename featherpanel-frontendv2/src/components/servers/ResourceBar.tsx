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
import { getUsagePercentage, getProgressColor, getProgressWidth } from '@/lib/server-utils'

interface ResourceBarProps {
	label: string
	used: number
	limit: number
	formatter?: (value: number) => string
}

export function ResourceBar({ label, used, limit, formatter }: ResourceBarProps) {
	const percentage = getUsagePercentage(used, limit)
	const isUnlimited = limit === 0

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-xs">
				<span className="font-semibold text-muted-foreground">{label}</span>
				<span className="font-medium">
					{isUnlimited
						? `${formatter ? formatter(used) : used} / ∞`
						: `${formatter ? formatter(used) : used} / ${formatter ? formatter(limit) : limit}`
					}
				</span>
			</div>
			<div className="h-2 bg-muted rounded-full overflow-hidden">
				<div
					className={cn('h-full transition-all duration-500', getProgressColor(percentage, isUnlimited))}
					style={{ width: getProgressWidth(used, limit) }}
				/>
			</div>
		</div>
	)
}
