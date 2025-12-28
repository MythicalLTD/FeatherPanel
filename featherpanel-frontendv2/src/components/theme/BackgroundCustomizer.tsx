'use client'

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { Fragment, useState, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Image, ArrowUp, XIcon } from 'lucide-react'

interface BackgroundCustomizerProps {
	children?: React.ReactNode
}

export default function BackgroundCustomizer({ children }: BackgroundCustomizerProps) {
	const { backgroundType, backgroundImage, setBackgroundType, setBackgroundImage } = useTheme()
	const [isOpen, setIsOpen] = useState(false)
	const [imageUrl, setImageUrl] = useState(backgroundImage)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const gradientPresets = [
		{
			name: 'Purple Dream',
			value: 'purple-dream',
			gradient: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 50%, rgba(147, 51, 234, 0.1) 100%)'
		},
		{
			name: 'Ocean Breeze',
			value: 'ocean-breeze',
			gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(6, 182, 212, 0.1) 100%)'
		},
		{
			name: 'Sunset Glow',
			value: 'sunset-glow',
			gradient: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(239, 68, 68, 0.05) 50%, rgba(251, 146, 60, 0.1) 100%)'
		},
		{
			name: 'Forest Mist',
			value: 'forest-mist',
			gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(34, 197, 94, 0.1) 100%)'
		},
		{
			name: 'Rose Garden',
			value: 'rose-garden',
			gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 50%, rgba(236, 72, 153, 0.1) 100%)'
		},
		{
			name: 'Golden Hour',
			value: 'golden-hour',
			gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 50%, rgba(251, 191, 36, 0.1) 100%)'
		},
	]

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			const reader = new FileReader()
			reader.onload = (event) => {
				const dataUrl = event.target?.result as string
				setImageUrl(dataUrl)
				setBackgroundImage(dataUrl)
				setBackgroundType('image')
			}
			reader.readAsDataURL(file)
		}
	}

	const handleSaveUrl = () => {
		setBackgroundImage(imageUrl)
		setBackgroundType('image')
		setIsOpen(false)
	}

	const handleSelectGradient = (gradientValue: string) => {
		setBackgroundImage(gradientValue)
		setBackgroundType('gradient')
		setIsOpen(false)
	}

	return (
		<>
			{children ? (
				<div onClick={() => setIsOpen(true)} className="contents cursor-pointer">
					{children}
				</div>
			) : (
				<button
					onClick={() => setIsOpen(true)}
					className="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-110 hover:shadow-lg transition-all duration-200 flex items-center justify-center"
					title="Customize background"
				>
					<Image className="h-4 w-4" />
				</button>
			)}

			<Transition appear show={isOpen} as={Fragment}>
				<Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
					<TransitionChild
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
					</TransitionChild>

					<div className="fixed inset-0 overflow-y-auto">
						<div className="flex min-h-full items-center justify-center p-4">
							<TransitionChild
								as={Fragment}
								enter="ease-out duration-300"
								enterFrom="opacity-0 scale-95"
								enterTo="opacity-100 scale-100"
								leave="ease-in duration-200"
								leaveFrom="opacity-100 scale-100"
								leaveTo="opacity-0 scale-95"
							>
								<DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-card border border-border/50 p-6 shadow-xl transition-all">
									<div className="flex items-center justify-between mb-6">
										<DialogTitle className="text-lg font-semibold text-foreground">
											Background Settings
										</DialogTitle>
										<button
											onClick={() => setIsOpen(false)}
											className="rounded-lg p-1 hover:bg-accent transition-colors"
										>
											<XIcon className="h-5 w-5" />
										</button>
									</div>

									<TabGroup>
										<TabList className="flex space-x-1 rounded-xl bg-muted p-1 mb-6">
											<Tab className={({ selected }) =>
												`w-full rounded-lg py-2.5 text-sm font-medium transition-all
                        ${selected
													? 'bg-background text-foreground shadow'
													: 'text-muted-foreground hover:bg-background/50'
												}`
											}>
												Gradients
											</Tab>
											<Tab className={({ selected }) =>
												`w-full rounded-lg py-2.5 text-sm font-medium transition-all
                        ${selected
													? 'bg-background text-foreground shadow'
													: 'text-muted-foreground hover:bg-background/50'
												}`
											}>
												Solid/Pattern
											</Tab>
											<Tab className={({ selected }) =>
												`w-full rounded-lg py-2.5 text-sm font-medium transition-all
                        ${selected
													? 'bg-background text-foreground shadow'
													: 'text-muted-foreground hover:bg-background/50'
												}`
											}>
												Custom Image
											</Tab>
										</TabList>

										<TabPanels>
											{/* Gradient Presets */}
											<TabPanel>
												<div className="grid grid-cols-2 gap-3">
													{gradientPresets.map((preset) => (
														<button
															key={preset.value}
															onClick={() => handleSelectGradient(preset.value)}
															className={`
                                relative p-4 rounded-xl border-2 transition-all
                                ${backgroundType === 'gradient' && backgroundImage === preset.value
																	? 'border-primary ring-2 ring-primary/20'
																	: 'border-border hover:border-primary/50'
																}
                              `}
														>
															<div
																className="h-20 rounded-lg mb-2"
																style={{ background: preset.gradient }}
															/>
															<p className="text-sm font-medium">{preset.name}</p>
														</button>
													))}
												</div>
											</TabPanel>

											{/* Solid/Pattern */}
											<TabPanel>
												<div className="grid grid-cols-2 gap-3">
													<button
														onClick={() => {
															setBackgroundType('solid')
															setIsOpen(false)
														}}
														className={`
                              relative p-4 rounded-xl border-2 transition-all
                              ${backgroundType === 'solid'
																? 'border-primary ring-2 ring-primary/20'
																: 'border-border hover:border-primary/50'
															}
                            `}
													>
														<div className="h-20 rounded-lg mb-2 bg-background" />
														<p className="text-sm font-medium">Solid Color</p>
													</button>
													<button
														onClick={() => {
															setBackgroundType('pattern')
															setIsOpen(false)
														}}
														className={`
                              relative p-4 rounded-xl border-2 transition-all
                              ${backgroundType === 'pattern'
																? 'border-primary ring-2 ring-primary/20'
																: 'border-border hover:border-primary/50'
															}
                            `}
													>
														<div
															className="h-20 rounded-lg mb-2 bg-background opacity-50"
															style={{
																backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
																backgroundSize: '16px 16px'
															}}
														/>
														<p className="text-sm font-medium">Dot Pattern</p>
													</button>
												</div>
											</TabPanel>

											{/* Custom Image */}
											<TabPanel>
												<div className="space-y-4">
													{/* File Upload */}
													<div>
														<label className="block text-sm font-medium mb-2">
															Upload Local Image
														</label>
														<input
															ref={fileInputRef}
															type="file"
															accept="image/*"
															onChange={handleFileUpload}
															className="hidden"
														/>
														<Button
															onClick={() => fileInputRef.current?.click()}
															variant="outline"
															className="w-full"
														>
															<ArrowUp className="h-4 w-4 mr-2" />
															Choose File
														</Button>
													</div>

													<div className="relative">
														<div className="absolute inset-0 flex items-center">
															<div className="w-full border-t border-border" />
														</div>
														<div className="relative flex justify-center text-xs">
															<span className="bg-card px-2 text-muted-foreground">OR</span>
														</div>
													</div>

													{/* URL Input */}
													<div>
														<label className="block text-sm font-medium mb-2">
															Image URL
														</label>
														<input
															type="url"
															value={imageUrl}
															onChange={(e) => setImageUrl(e.target.value)}
															placeholder="https://example.com/image.jpg"
															className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
														/>
														<Button onClick={handleSaveUrl} className="w-full mt-3">
															Apply Image
														</Button>
													</div>
												</div>
											</TabPanel>
										</TabPanels>
									</TabGroup>
								</DialogPanel>
							</TransitionChild>
						</div>
					</div>
				</Dialog>
			</Transition>
		</>
	)
}
