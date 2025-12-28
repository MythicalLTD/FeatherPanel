'use client'

import { Suspense } from 'react'
import ForgotPasswordForm from './ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
	<Suspense fallback={
	  <div className="flex items-center justify-center p-8">
		<div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
	  </div>
	}>
	  <ForgotPasswordForm />
	</Suspense>
  )
}
