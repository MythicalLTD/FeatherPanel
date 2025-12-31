'use client'

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface Option {
    id: string | number
    name: string
    image?: string
}

interface HeadlessSelectProps {
    value: string | number
    onChange: (value: string | number) => void
    options: Option[]
    placeholder?: string
    className?: string
    label?: string
    description?: string
    buttonClassName?: string
    disabled?: boolean
}

export function HeadlessSelect({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    className,
    buttonClassName,
    label,
    description,
    disabled
}: HeadlessSelectProps) {
    const selectedOption = options.find(o => o.id === value) || null

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className={clsx("relative mt-1", className)}>
                {label && (
                    <Listbox.Label className="block text-sm font-semibold text-foreground mb-1">
                        {label}
                    </Listbox.Label>
                )}
                {description && (
                    <p className="text-sm text-muted-foreground mb-2">
                        {description}
                    </p>
                )}
                <Listbox.Button 
                    className={clsx(
                        "relative w-full cursor-pointer rounded-xl border transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary py-3 pl-4 pr-10 text-left sm:text-sm shadow-sm",
                        buttonClassName || "bg-background border-border/50 hover:border-border",
                        !disabled && "hover:shadow-md group",
                        disabled && "opacity-50 cursor-not-allowed bg-muted/30"
                    )}
                >
                    <span className={clsx("flex items-center gap-3 truncate", !selectedOption && "text-muted-foreground")}>
                        {selectedOption?.image && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={selectedOption.image} alt="" className="h-5 w-5 rounded object-cover" />
                        )}
                        <span className={clsx("font-medium", selectedOption ? "text-foreground" : "")}>
                            {selectedOption ? selectedOption.name : placeholder}
                        </span>
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
                    </span>
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-2 scale-95"
                    enterTo="opacity-100 translate-y-0 scale-100"
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100 translate-y-0 scale-100"
                    leaveTo="opacity-0 translate-y-2 scale-95"
                >
                    <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-2xl bg-popover/80 backdrop-blur-3xl border border-white/10 dark:border-white/5 py-1 text-base shadow-[0_20px_50px_rgba(0,0,0,0.3)] focus:outline-none sm:text-sm z-50 custom-scrollbar p-1.5 animate-in fade-in zoom-in-95 duration-200">
                        {options.map((option) => (
                            <Listbox.Option
                                key={option.id}
                                className={({ active, selected }) =>
                                    clsx(
                                        "relative cursor-pointer select-none py-3 pl-4 pr-10 rounded-xl transition-all duration-200 mx-0.5 my-0.5 group",
                                        active ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" : (selected ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted/50")
                                    )
                                }
                                value={option.id}
                            >
                                {({ selected, active }) => (
                                    <div className="flex items-center gap-3">
                                        {option.image && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={option.image} alt="" className="h-6 w-6 rounded-lg object-cover ring-2 ring-white/10" />
                                        )}
                                        <span className={clsx("block truncate text-sm", selected ? "font-bold" : "font-medium")}>
                                            {option.name}
                                        </span>
                                        {selected ? (
                                            <span className={clsx("absolute inset-y-0 right-0 flex items-center pr-4 transition-colors", active ? "text-white" : "text-primary")}>
                                                <Check className="h-4 w-4 stroke-[3px]" aria-hidden="true" />
                                            </span>
                                        ) : null}
                                    </div>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    )
}
