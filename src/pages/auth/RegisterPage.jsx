// src/pages/auth/RegisterPage.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Globe, Shield, ShoppingBag } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { Alert, AlertDescription, Button, Card, CardContent, Input, Label } from '@/components/ui'
import { authAPI } from '@/services/api'
import { useAuthStore, useUIStore } from '@/store'
import { initSocket } from '@/lib/socket'
import toast from 'react-hot-toast'

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })

export default function RegisterPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()
  const { setLanguage } = useUIStore()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(registerSchema) })

  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  const applyAuth = ({ user, accessToken, refreshToken }) => {
    setAuth({ user, accessToken, refreshToken })
    initSocket(accessToken)
    navigate('/')
  }

  const handleRegister = async ({ confirmPassword, ...data }) => {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.register(data)
      applyAuth(res.data)
      toast.success(res.message || 'Registration successful!')
    } catch (err) {
      setError(err?.message || 'Unable to create your account.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true)
    setError('')
    try {
      if (!credentialResponse.credential) throw new Error('No credential from Google')
      const res = await authAPI.googleLogin({ token: credentialResponse.credential })
      applyAuth(res.data)
      toast.success('Google sign-up successful!')
    } catch (err) {
      setError(err?.message || 'Google sign-up failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const toggleLang = () => {
    const newLang = i18n.language === 'hi' ? 'en' : 'hi'
    i18n.changeLanguage(newLang)
    setLanguage(newLang)
  }

  const fieldError = (field) => errors[field] && <p className="text-xs text-destructive">{errors[field].message}</p>

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <div className="flex justify-between items-center p-4"><Button variant="ghost" size="icon-sm" onClick={() => navigate('/auth/login')}><ArrowLeft className="h-4 w-4" /></Button><Button variant="ghost" size="sm" onClick={toggleLang} className="gap-2"><Globe className="h-4 w-4" /> {i18n.language === 'hi' ? 'EN' : 'हिं'}</Button></div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-3 mb-8"><div className="h-16 w-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200"><ShoppingBag className="h-9 w-9 text-white" /></div><div className="text-center"><h1 className="text-2xl font-bold text-gray-900 dark:text-white">ShopLink</h1><p className="text-sm text-muted-foreground mt-0.5">{t('app.tagline')}</p></div></div>
        <Card className="w-full max-w-sm shadow-xl border-0 dark:border"><CardContent className="pt-6 pb-6 px-6 space-y-4">
          <div><h2 className="text-lg font-semibold">Create Account</h2><p className="text-sm text-muted-foreground mt-1">Join ShopLink with your email</p></div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="register-name">Name</Label><Input id="register-name" autoComplete="name" {...register('name')} />{fieldError('name')}</div>
            <div className="space-y-1.5"><Label htmlFor="register-email">Email</Label><Input id="register-email" type="email" autoComplete="email" {...register('email')} />{fieldError('email')}</div>
            <div className="space-y-1.5"><Label htmlFor="register-password">Password</Label><Input id="register-password" type="password" autoComplete="new-password" {...register('password')} />{fieldError('password')}</div>
            <div className="space-y-1.5"><Label htmlFor="register-confirm-password">Confirm Password</Label><Input id="register-confirm-password" type="password" autoComplete="new-password" {...register('confirmPassword')} />{fieldError('confirmPassword')}</div>
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>{loading ? 'Creating account...' : 'Create Account'}</Button>
          </form>
          <div className="flex items-center gap-2"><div className="flex-1 h-px bg-gray-300" /><span className="text-xs text-muted-foreground">OR</span><div className="flex-1 h-px bg-gray-300" /></div>
          <div className="flex justify-center"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google sign-up failed. Please try again.')} text="signup_with" size="large" width="280" /></div>
          <div className="pt-2 border-t text-center"><p className="text-sm text-muted-foreground">Already have an account? <Link to="/auth/login" className="text-orange-500 font-semibold hover:underline">Login</Link></p></div>
        </CardContent></Card>
        <div className="mt-8 text-center text-xs text-muted-foreground"><div className="flex gap-2 items-center justify-center"><Shield className="h-3.5 w-3.5" /><span>Your data is secure and encrypted</span></div></div>
      </div>
    </div>
  )
}