'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

interface Language {
	code: string
	name: string
	nativeName: string
}

interface TranslationContextType {
	locale: string
	translations: Record<string, unknown>
	availableLanguages: Language[]
	setLocale: (locale: string) => Promise<void>
	t: (key: string, params?: Record<string, string>) => string
	loading: boolean
	initialLoading: boolean
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

const DEFAULT_LOCALE = 'en'
const CACHE_VERSION = '1.0'

export function TranslationProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState(() => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('locale') || DEFAULT_LOCALE
		}
		return DEFAULT_LOCALE
	})
	const [translations, setTranslations] = useState<Record<string, unknown>>({})
	const [availableLanguages, setAvailableLanguages] = useState<Language[]>([
		{ code: 'en', name: 'English', nativeName: 'English' }
	])
	const [loading, setLoading] = useState(false)
	const [initialLoading, setInitialLoading] = useState(true)

	// Load full translations from public folder or API
	const loadFullTranslations = useCallback(async (lang: string) => {
		try {
			// Try to load from public folder first (fast, no network)
			const publicResponse = await fetch(`/locales/${lang}.json`)
			if (publicResponse.ok) {
				const publicData = await publicResponse.json()
				setTranslations(publicData)
				setInitialLoading(false)
			}
		} catch {
			// Ignore error, will try API next
		}

		// Then try API in background for latest updates
		try {
			const cacheKey = `translations_${lang}_${CACHE_VERSION}`
			const cached = localStorage.getItem(cacheKey)

			if (cached) {
				const parsedCache = JSON.parse(cached)
				setTranslations(parsedCache)
				setInitialLoading(false)
			}

			// Fetch fresh from API
			const response = await fetch(`/api/translations/${lang}`)
			if (response.ok) {
				const data = await response.json()
				setTranslations(data)
				localStorage.setItem(cacheKey, JSON.stringify(data))
			}
		} catch (error) {
			console.error("Failed to load translations from API:", error)
		} finally {
			setInitialLoading(false)
		}
	}, [])

	// Load available languages from API
	const loadAvailableLanguages = useCallback(async () => {
		try {
			const response = await fetch('/api/translations/languages')
			console.log("[DEBUG] [TranslationContext] [SSR] Where is this? Who knows...")  // This doesn't exist just yet (I was planning to add it so you can download language packages if you needed them and php will server them to the frontend)
			if (response.ok) {
				const languages = await response.json()
				setAvailableLanguages(languages)
			}
		} catch {
			// API not available, keep default
		}
	}, [])

	// Initialize on mount
	useEffect(() => {
		loadFullTranslations(locale)
		loadAvailableLanguages()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [locale]) // loadFullTranslations and loadAvailableLanguages are stable (empty deps)

	// Change locale
	const setLocale = async (newLocale: string) => {
		setLoading(true)
		setLocaleState(newLocale)
		localStorage.setItem('locale', newLocale)
		await loadFullTranslations(newLocale)
		setLoading(false)
	}

	// Translation function with nested key support and parameter interpolation
	const t = useCallback((key: string, params?: Record<string, string>): string => {
		const keys = key.split('.')
		let value: unknown = translations

		for (const k of keys) {
			if (value && typeof value === 'object' && k in value) {
				value = (value as Record<string, unknown>)[k]
			} else {
				return key // Return key if translation not found
			}
		}

		if (typeof value !== 'string') {
			return key
		}

		// Replace parameters
		if (params) {
			return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
				return params[paramKey] || match
			})
		}

		return value
	}, [translations])

	return (
		<TranslationContext.Provider
			value={{
				locale,
				translations,
				availableLanguages,
				setLocale,
				t,
				loading,
				initialLoading,
			}}
		>
			{children}
		</TranslationContext.Provider>
	)
}

export function useTranslation() {
	const context = useContext(TranslationContext)
	if (!context) {
		throw new Error('useTranslation must be used within TranslationProvider')
	}
	return context
}
