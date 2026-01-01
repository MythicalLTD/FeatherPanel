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

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/contexts/TranslationContext'
import axios from 'axios'

export default function VerifyTwoFactorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  
  // Support both legacy 'email' and new 'username_or_email' query params
  const email = searchParams.get('email') || searchParams.get('username_or_email') || ''
  
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!code || code.trim() === '') {
      setError(t('validation.fill_all_fields'))
      return
    }

    if (code.length !== 6) {
      setError('Verification code must be 6 digits')
      return
    }

    if (!email) {
      setError('Email is required')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/api/user/auth/two-factor', {
        email: email,
        code: code.trim(),
      })

      if (response.data && response.data.success) {
        setSuccess(t('common.success'))
		
        setTimeout(() => {
          router.push('/dashboard')
        }, 1200)
      } else {
        setError(response.data?.message || t('common.error'))
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input
    const value = e.target.value.replace(/\D/g, '')
    setCode(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t('auth.verify_2fa.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('auth.verify_2fa.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label={t('auth.verify_2fa.code')}
          type="text"
          value={code}
          onChange={handleCodeInput}
          placeholder="000000"
          required
          maxLength={6}
          autoComplete="one-time-code"
          inputMode="numeric"
          className="text-center text-2xl tracking-widest font-mono"
        />

        <Button
          type="submit"
          className="w-full group"
          disabled={code.length !== 6}
          loading={loading}
        >
          {!loading && (
            <>
              {t('auth.verify_2fa.submit')}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm animate-fade-in">
            {success}
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        {t('auth.verify_2fa.lost_access')}{' '}
        <button
          type="button"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
          onClick={() => router.push('/auth/login')}
        >
          {t('auth.verify_2fa.go_back')}
        </button>
      </div>
    </div>
  )
}
