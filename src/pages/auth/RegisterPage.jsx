// src/pages/auth/RegisterPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShoppingBag, Phone, Shield, ChevronRight, Globe, ArrowLeft } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { Button, Input, Label, Card, CardContent, Alert, AlertDescription } from '@/components/ui'
import { authAPI } from '@/services/api'
import { useAuthStore, useUIStore } from '@/store'
import { initSocket } from '@/lib/socket'
import toast from 'react-hot-toast'

const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
})

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'Only numbers allowed'),
})

export default function RegisterPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()
  const { setLanguage } = useUIStore()

  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [error, setError] = useState('')

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated])

  // Resend OTP countdown
  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendTimer])

  const phoneForm = useForm({ resolver: zodResolver(phoneSchema) })
  const otpForm = useForm({ resolver: zodResolver(otpSchema) })

  const handleSendOTP = async (data) => {
    setLoading(true)
    setError('')
    try {
      await authAPI.sendOTP({ phone: data.phone, purpose: 'register' })
      setPhone(data.phone)
      setStep('otp')
      setResendTimer(60)
      toast.success(t('auth.otp_sent') || 'OTP sent to your phone!')
    } catch (err) {
      setError(err?.message || 'Failed to send OTP. Please try again.')
      toast.error(err?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (data) => {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.verifyOTP({ phone, otp: data.otp })
      const { user, accessToken, refreshToken } = res.data

      setAuth({ user, accessToken, refreshToken })
      initSocket(accessToken)

      toast.success('Registration successful! Please complete your profile.')

      // New user → complete profile
      navigate('/auth/complete-profile')
    } catch (err) {
      setError(err?.message || 'Invalid OTP')
      otpForm.setError('otp', { message: err?.message || 'Invalid OTP. Please try again.' })
      toast.error(err?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      await authAPI.sendOTP({ phone, purpose: 'register' })
      setResendTimer(60)
      toast.success(t('auth.otp_sent') || 'OTP resent!')
    } catch (err) {
      toast.error(err?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth handler
  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true)
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential from Google')
      }

      const res = await authAPI.googleLogin({
        token: credentialResponse.credential,
      })

      const { user, accessToken, refreshToken } = res.data

      setAuth({ user, accessToken, refreshToken })
      initSocket(accessToken)

      toast.success('Google sign-up successful!')

      // Redirect to complete profile for new users
      if (user.name?.startsWith('User') || !user.phone) {
        navigate('/auth/complete-profile')
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Google sign-up failed:', error)
      toast.error(error?.message || 'Google sign-up failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleError = () => {
    toast.error('Google sign-up failed. Please try again.')
  }

  const toggleLang = () => {
    const newLang = i18n.language === 'hi' ? 'en' : 'hi'
    i18n.changeLanguage(newLang)
    setLanguage(newLang)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/auth/login')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleLang} className="gap-2">
          <Globe className="h-4 w-4" />
          {i18n.language === 'hi' ? 'EN' : 'हिं'}
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-16 w-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
            <ShoppingBag className="h-9 w-9 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ShopLink</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('app.tagline')}</p>
          </div>
        </div>

        {/* Card */}
        <Card className="w-full max-w-sm shadow-xl border-0 dark:border">
          <CardContent className="pt-6 pb-6 px-6 space-y-4">
            {step === 'phone' ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold">{t('auth.register') || 'Create Account'}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('auth.enter_phone') || 'Enter your mobile number to get started'}
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Google Sign-Up Button */}
                <div className="flex justify-center py-2">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text="signup_with"
                    size="large"
                    width="280"
                  />
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">
                      {t('auth.or') || 'या'}
                    </span>
                  </div>
                </div>

                <form onSubmit={phoneForm.handleSubmit(handleSendOTP)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t('auth.phone')}</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 rounded-lg border bg-muted text-sm text-muted-foreground flex-shrink-0">
                        🇮🇳 +91
                      </div>
                      <Input
                        placeholder="9876543210"
                        {...phoneForm.register('phone')}
                        maxLength="10"
                        inputMode="numeric"
                        className="flex-1"
                      />
                    </div>
                    {phoneForm.formState.errors.phone && (
                      <p className="text-xs text-red-500">{phoneForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={loading || googleLoading}>
                    {loading ? 'Sending OTP...' : <>
                      {t('auth.continue')} <ChevronRight className="h-4 w-4" />
                    </>}
                  </Button>
                </form>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.already_have_account') || 'Already have an account?'}
                  </p>
                  <Link to="/auth/login">
                    <Button variant="outline" className="w-full">
                      {t('auth.login')}
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-semibold">{t('auth.verify_otp') || 'Verify OTP'}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('auth.otp_sent_to')} +91{phone}
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t('auth.otp')}</Label>
                    <Input
                      placeholder="000000"
                      {...otpForm.register('otp')}
                      maxLength="6"
                      inputMode="numeric"
                      className="text-center text-lg tracking-widest"
                    />
                    {otpForm.formState.errors.otp && (
                      <p className="text-xs text-red-500">{otpForm.formState.errors.otp.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Verifying...' : t('auth.verify')}
                  </Button>
                </form>

                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {resendTimer > 0
                      ? `Resend OTP in ${resendTimer}s`
                      : t('auth.did_not_receive')}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0 || loading}
                    className="w-full"
                  >
                    {t('auth.resend_otp')}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('phone')}
                  className="w-full"
                >
                  {t('auth.change_number')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-muted-foreground max-w-sm">
          <div className="flex gap-2 items-center justify-center mb-2">
            <Shield className="h-3.5 w-3.5" />
            <span>{t('auth.secure_login') || 'Your data is secure and encrypted'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
