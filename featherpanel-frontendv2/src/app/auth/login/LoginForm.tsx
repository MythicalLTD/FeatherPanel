'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/contexts/TranslationContext'
import { useSettings } from '@/contexts/SettingsContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useSession } from '@/contexts/SessionContext'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import Turnstile from 'react-turnstile'
import { authApi } from '@/lib/api/auth'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const { settings } = useSettings()
  const { theme } = useTheme()
  const { fetchSession } = useSession()

  
  const [form, setForm] = useState({
    username_or_email: searchParams.get('username_or_email') || '',
    password: '',
    turnstile_token: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [turnstileKey, setTurnstileKey] = useState(0) // Key to force re-render

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!form.username_or_email || !form.password) {
      setError(t('validation.fill_all_fields'))
      return
    }

    if (form.password.length < 8) {
      setError(t('validation.min_length', { min: '8' }))
      return
    }

    // Check Turnstile if enabled (skip in development)
    if (turnstileEnabled && !form.turnstile_token) {
      setError(t('validation.captcha_required'))
      return
    }

    setLoading(true)

    try {
      const response = await authApi.login({
        username_or_email: form.username_or_email,
        password: form.password,
        turnstile_token: form.turnstile_token,
      })

      if (response.success) {
        // Check if 2FA is required
        if (response.data?.requires_2fa) {
          router.push(`/auth/verify-2fa?username_or_email=${encodeURIComponent(form.username_or_email)}`)
          return
        }

        setSuccess(t('common.success'))

        // Fetch session to load user data immediately
        await fetchSession(true)

        setTimeout(() => {
          const redirect = searchParams.get('redirect')
          if (redirect && redirect.startsWith('/')) {
            router.push(redirect)
          } else {
            router.push('/dashboard')
          }
        }, 1000)
      } else {
        setError(response.message || t('common.error'))
        // Reset Turnstile by forcing component re-render
        if (showTurnstile) {
          setForm(prev => ({ ...prev, turnstile_token: '' }))
          setTurnstileKey(prev => prev + 1)
        }
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error_code?: string; data?: { email?: string } } } }
      
      // Check if 2FA is required
      if (error.response?.data?.error_code === 'TWO_FACTOR_REQUIRED') {
        const email = error.response.data.data?.email || form.username_or_email
        router.push(`/auth/verify-2fa?username_or_email=${encodeURIComponent(email)}`)
        return
      }
      
      setError(error.response?.data?.message || t('common.error'))
      
      // Reset Turnstile by forcing component re-render
      if (showTurnstile) {
        setForm(prev => ({ ...prev, turnstile_token: '' }))
        setTurnstileKey(prev => prev + 1)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDiscordLogin = () => {
    window.location.href = '/api/user/auth/discord/login'
  }

  const handleTurnstileSuccess = (token: string) => {
    setForm({ ...form, turnstile_token: token })
  }

  const turnstileEnabled = settings?.turnstile_enabled === 'true'
  const turnstileSiteKey = settings?.turnstile_key_pub || ''
  const discordEnabled = settings?.discord_oauth_enabled === 'true'
  const showTurnstile = turnstileEnabled && turnstileSiteKey

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{t('auth.login.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('auth.login.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label={t('auth.login.username')}
          type="text"
          value={form.username_or_email}
          onChange={(e) => setForm({ ...form, username_or_email: e.target.value })}
          required
          autoComplete="username"
          icon={<Mail className="h-5 w-5" />}
          placeholder={t('auth.login.username')}
        />

        <Input
          label={t('auth.login.password')}
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          autoComplete="current-password"
          icon={<Lock className="h-5 w-5" />}
          placeholder={t('auth.login.password')}
        />

        <div className="flex items-center justify-end">
          <button
            type="button"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            onClick={() => router.push('/auth/forgot-password')}
          >
            {t('auth.login.forgot_password')}
          </button>
        </div>

        {/* Turnstile Widget */}
        {showTurnstile && (
          <div className="flex justify-center">
            <Turnstile
              key={turnstileKey}
              sitekey={turnstileSiteKey}
              theme={theme === 'dark' ? 'dark' : 'light'}
              size="normal"
              refreshExpired="auto"
              onVerify={handleTurnstileSuccess}
              onError={() => {
                // Widget errored, clear token
                setForm(prev => ({ ...prev, turnstile_token: '' }))
              }}
              onExpire={() => {
                // Token expired, clear it
                setForm(prev => ({ ...prev, turnstile_token: '' }))
              }}
            />
          </div>
        )}

        <Button
          type="submit"
          className="w-full group"
          loading={loading}
        >
          {!loading && (
            <>
              {t('auth.login.submit')}
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

      {/* Discord Login - Only show if enabled */}
      {discordEnabled && (
        <>
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('auth.login.or_continue')}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleDiscordLogin}
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.07.07 0 00-.075.035 13.812 13.812 0 00-.605 1.246 18.016 18.016 0 00-5.427 0 12.217 12.217 0 00-.617-1.246.064.064 0 00-.075-.035c-1.724.285-3.362.83-4.885 1.515a.06.06 0 00-.024.022C.533 8.059-.32 11.591.099 15.08a.078.078 0 00.028.055 20.53 20.53 0 006.104 3.108.073.073 0 00.078-.023c.472-.651.889-1.341 1.246-2.065a.07.07 0 00-.038-.094 13.235 13.235 0 01-1.885-.884.07.07 0 01-.007-.117c.126-.094.252-.192.374-.291a.06.06 0 01.061-.011c3.927 1.792 8.18 1.792 12.061 0 a.062.062 0 01.063.008c.122.099.248.197.374.291a.07.07 0 01-.006.117 12.298 12.298 0 01-1.885.883.07.07 0 00-.038.095c.36.723.777 1.413 1.246 2.064a.073.073 0 00.078.023 20.477 20.477 0 006.105-3.107.075.075 0 00.028-.055c.5-4.101-.838-7.597-3.548-10.692a.061.061 0 00-.024-.023zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.949-2.418 2.157-2.418 1.222 0 2.172 1.101 2.157 2.418 0 1.334-.949 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.948-2.418 2.157-2.418 1.221 0 2.171 1.101 2.157 2.418 0 1.334-.936 2.419-2.157 2.419z" />
            </svg>
            {t('auth.login.discord')}
          </Button>
        </>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        {t('auth.login.no_account')}{' '}
        <button
          type="button"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
          onClick={() => router.push('/auth/register')}
        >
          {t('auth.login.create_account')}
        </button>
      </div>
    </div>
  )
}
