'use client'

import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { Check, Globe } from 'lucide-react'

export default function LanguageSelector() {
	const { locale, availableLanguages, setLocale, t } = useTranslation()
	const [mounted] = useState(true)

	// Don't render until mounted to avoid hydration mismatch
	if (!mounted) {
		return (
			<div className="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md" />
		)
	}

	return (
		<Menu as="div" className="relative">
			<MenuButton className="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-110 hover:shadow-lg transition-all duration-200 flex items-center justify-center">
				<Globe className="h-4 w-4" />
			</MenuButton>

			<Transition
				as={Fragment}
				enter="transition ease-out duration-100"
				enterFrom="transform opacity-0 scale-95"
				enterTo="transform opacity-100 scale-100"
				leave="transition ease-in duration-75"
				leaveFrom="transform opacity-100 scale-100"
				leaveTo="transform opacity-0 scale-95"
			>
				<MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-card border border-border/50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none backdrop-blur-xl p-2">
					<div className="px-3 py-2 text-sm font-semibold text-foreground border-b border-border/50 mb-2">
						{t('appearance.language')}
					</div>
					{availableLanguages.map((language) => (
						<MenuItem key={language.code}>
							{({ focus }) => (
								<button
									onClick={() => setLocale(language.code)}
									className={`${focus ? 'bg-accent' : ''
										} group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
								>
									<span className="flex-1 text-left">
										<span className="font-medium">{language.nativeName}</span>
										{language.name !== language.nativeName && (
											<span className="text-xs text-muted-foreground ml-1">({language.name})</span>
										)}
									</span>
									{locale === language.code && (
										<Check className="h-4 w-4 text-primary" />
									)}
								</button>
							)}
						</MenuItem>
					))}
				</MenuItems>
			</Transition>
		</Menu>
	)
}
