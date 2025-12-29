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
}

export function HeadlessSelect({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    className,
    buttonClassName,
    label,
    description
}: HeadlessSelectProps) {
    const selectedOption = options.find(o => o.id === value) || null

    return (
        <Listbox value={value} onChange={onChange}>
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
                <Listbox.Button className={clsx("relative w-full cursor-pointer rounded-xl border transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary py-3 pl-4 pr-10 text-left sm:text-sm shadow-sm hover:shadow-md group", buttonClassName || "bg-background border-border/50 hover:border-border")}>
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
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-xl bg-popover border border-border/50 py-1 text-base shadow-xl focus:outline-none sm:text-sm z-50 custom-scrollbar p-1">
                        {options.map((option) => (
                            <Listbox.Option
                                key={option.id}
                                className={({ active }) =>
                                    clsx(
                                        "relative cursor-pointer select-none py-2.5 pl-3 pr-4 rounded-lg transition-colors mx-1 my-0.5",
                                        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                                    )
                                }
                                value={option.id}
                            >
                                {({ selected }) => (
                                    <div className="flex items-center gap-3">
                                        {option.image && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={option.image} alt="" className="h-5 w-5 rounded object-cover" />
                                        )}
                                        <span className={clsx("block truncate", selected ? "font-semibold" : "font-medium")}>
                                            {option.name}
                                        </span>
                                        {selected ? (
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary">
                                                <Check className="h-4 w-4" aria-hidden="true" />
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
