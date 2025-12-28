'use client'

import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { CheckIcon } from '@heroicons/react/24/outline'
import BackgroundCustomizer from '@/components/theme/BackgroundCustomizer'
import LanguageSelector from '@/components/layout/LanguageSelector'

export default function ThemeCustomizer() {
  const { theme, accentColor, toggleTheme, setAccentColor } = useTheme()
  const [mounted] = useState(true)

  const accentColorOptions = [
    { name: 'Purple', value: 'purple', color: 'hsl(262 83% 58%)' },
    { name: 'Blue', value: 'blue', color: 'hsl(217 91% 60%)' },
    { name: 'Green', value: 'green', color: 'hsl(142 71% 45%)' },
    { name: 'Red', value: 'red', color: 'hsl(0 84% 60%)' },
    { name: 'Orange', value: 'orange', color: 'hsl(25 95% 53%)' },
    { name: 'Pink', value: 'pink', color: 'hsl(330 81% 60%)' },
    { name: 'Teal', value: 'teal', color: 'hsl(173 80% 40%)' },
    { name: 'Yellow', value: 'yellow', color: 'hsl(48 96% 53%)' },
  ]

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md" />
        <div className="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md" />
        <div className="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md" />
        <div className="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Language Selector */}
      <LanguageSelector />
      
      {/* Background Customizer */}
      <BackgroundCustomizer />
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-110 hover:shadow-lg transition-all duration-200 flex items-center justify-center"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {/* Accent Color Picker using Headless UI Menu */}
      <Menu as="div" className="relative">
        <MenuButton className="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-110 hover:shadow-lg transition-all duration-200 flex items-center justify-center">
          <div 
            className="h-5 w-5 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: accentColorOptions.find(c => c.value === accentColor)?.color }}
          />
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
              Accent Color
            </div>
            {accentColorOptions.map((option) => (
              <MenuItem key={option.value}>
                {({ focus }) => (
                  <button
                    onClick={() => setAccentColor(option.value)}
                    className={`${
                      focus ? 'bg-accent' : ''
                    } group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
                  >
                    <div
                      className="h-5 w-5 rounded-full border-2 border-white shadow-sm mr-3"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="flex-1 text-left">{option.name}</span>
                    {accentColor === option.value && (
                      <CheckIcon className="h-4 w-4 text-primary" />
                    )}
                  </button>
                )}
              </MenuItem>
            ))}
          </MenuItems>
        </Transition>
      </Menu>
    </div>
  )
}
