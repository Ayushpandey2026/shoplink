// src/pages/auth/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShoppingBag, Phone, Shield, ChevronRight, Globe } from 'lucide-react'
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

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()
  const { setLanguage } = useUIStore()

  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

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
    try {
      await authAPI.sendOTP({ phone: data.phone, purpose: 'login' })
      setPhone(data.phone)
      setStep('otp')
      setResendTimer(60)
      toast.success(t('auth.otp_sent'))
    } catch (err) {
      // If user not found, offer registration
      if (err?.message?.includes('No account found')) {
        try {
          await authAPI.sendOTP({ phone: data.phone, purpose: 'register' })
          setPhone(data.phone)
          setStep('otp')
          setResendTimer(60)
          toast.success('OTP sent! Complete registration after verification.')
        } catch {}
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (data) => {
    setLoading(true)
    try {
      const res = await authAPI.verifyOTP({ phone, otp: data.otp })
      const { user, accessToken, refreshToken } = res.data

      setAuth({ user, accessToken, refreshToken })
      initSocket(accessToken)

      toast.success(res.message || 'Login successful!')

      // New user → complete profile
      if (user.name?.startsWith('User')) {
        navigate('/auth/complete-profile')
      } else {
        navigate('/')
      }
    } catch {
      otpForm.setError('otp', { message: 'Invalid OTP. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendTimer > 0) return
    try {
      await authAPI.sendOTP({ phone, purpose: 'login' })
      setResendTimer(60)
      toast.success(t('auth.otp_sent'))
    } catch {}
  }

  const toggleLang = () => {
    const newLang = i18n.language === 'hi' ? 'en' : 'hi'
    i18n.changeLanguage(newLang)
    setLanguage(newLang)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Language toggle */}
      <div className="flex justify-end p-4">
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
                  <h2 className="text-lg font-semibold">{t('auth.welcome')}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('auth.phone')} दर्ज करें OTP के लिए
                  </p>
                </div>

                <form onSubmit={phoneForm.handleSubmit(handleSendOTP)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t('auth.phone')}</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 rounded-lg border bg-muted text-sm text-muted-foreground flex-shrink-0">
                        🇮🇳 +91
                      </div>
                      <Input
                        type="tel"
                        maxLength={10}
                        placeholder={t('auth.phone_placeholder')}
                        {...phoneForm.register('phone')}
                        className="flex-1"
                        inputMode="numeric"
                      />
                    </div>
                    {phoneForm.formState.errors.phone && (
                      <p className="text-xs text-destructive">{phoneForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending...' : t('auth.send_otp')}
                    {!loading && <ChevronRight className="h-4 w-4 ml-1" />}
                  </Button>
                </form>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3 flex-shrink-0" />
                  <span>आपका नंबर सुरक्षित है। हम OTP के अलावा कुछ नहीं भेजेंगे।</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <button
                    onClick={() => setStep('phone')}
                    className="text-xs text-orange-500 mb-2 flex items-center gap-1"
                  >
                    ← बदलें
                  </button>
                  <h2 className="text-lg font-semibold">{t('auth.verify_otp')}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    OTP भेजा गया: <strong>+91 {phone.replace(/(\d{2})\d{6}(\d{2})/, '$1xxxxxx$2')}</strong>
                  </p>
                </div>

                <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t('auth.otp_label')}</Label>
                    <Input
                      type="tel"
                      maxLength={6}
                      placeholder={t('auth.otp_placeholder')}
                      {...otpForm.register('otp')}
                      inputMode="numeric"
                      className="text-center text-xl tracking-[0.5em] font-mono"
                      autoFocus
                    />
                    {otpForm.formState.errors.otp && (
                      <p className="text-xs text-destructive">{otpForm.formState.errors.otp.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Verifying...' : t('auth.verify_otp')}
                  </Button>
                </form>

                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('auth.resend_in', { seconds: resendTimer })}
                    </p>
                  ) : (
                    <button onClick={handleResendOTP} className="text-xs text-orange-500 font-medium">
                      {t('auth.resend_otp')}
                    </button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trust badges */}
        <div className="flex gap-4 mt-6 text-xs text-muted-foreground">
          <span>🔒 Secure</span>
          <span>🏪 10,000+ Shops</span>
          <span>⚡ Instant</span>
        </div>
      </div>
    </div>
  )
}
