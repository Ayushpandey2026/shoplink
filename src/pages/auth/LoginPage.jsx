// src/pages/auth/LoginPage.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Globe, Shield, ShoppingBag } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { Alert, AlertDescription, Button, Card, CardContent, Input, Label } from '@/components/ui'
import { authAPI } from '@/services/api'
import { useAuthStore, useUIStore } from '@/store'
import { initSocket } from '@/lib/socket'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()
  const { setLanguage } = useUIStore()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) })

  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  const applyAuth = ({ user, accessToken, refreshToken }) => {
    setAuth({ user, accessToken, refreshToken })
    initSocket(accessToken)
    navigate('/')
  }

  const handleLogin = async (data) => {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.login(data)
      applyAuth(res.data)
      toast.success(res.message || 'Login successful!')
    } catch (err) {
      setError(err?.message || 'Unable to login. Please check your details.')
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
      toast.success('Google login successful!')
    } catch (err) {
      setError(err?.message || 'Google login failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const toggleLang = () => {
    const newLang = i18n.language === 'hi' ? 'en' : 'hi'
    i18n.changeLanguage(newLang)
    setLanguage(newLang)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <div className="flex justify-end p-4"><Button variant="ghost" size="sm" onClick={toggleLang} className="gap-2"><Globe className="h-4 w-4" /> {i18n.language === 'hi' ? 'EN' : 'हिं'}</Button></div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-3 mb-8"><div className="h-16 w-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200"><ShoppingBag className="h-9 w-9 text-white" /></div><div className="text-center"><h1 className="text-2xl font-bold text-gray-900 dark:text-white">ShopLink</h1><p className="text-sm text-muted-foreground mt-0.5">{t('app.tagline')}</p></div></div>
        <Card className="w-full max-w-sm shadow-xl border-0 dark:border"><CardContent className="pt-6 pb-6 px-6 space-y-4">
          <div><h2 className="text-lg font-semibold">{t('auth.login') || 'Login'}</h2><p className="text-sm text-muted-foreground mt-1">Access your ShopLink account</p></div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="flex justify-center py-2"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google login failed. Please try again.')} text="signin_with" size="large" width="280" /></div>
          <div className="flex items-center gap-2"><div className="flex-1 h-px bg-gray-300" /><span className="text-xs text-muted-foreground">OR</span><div className="flex-1 h-px bg-gray-300" /></div>
          <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="login-email">Email</Label><Input id="login-email" type="email" autoComplete="email" {...register('email')} />{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="login-password">Password</Label><Input id="login-password" type="password" autoComplete="current-password" {...register('password')} />{errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}</div>
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>{loading ? 'Logging in...' : 'Login'}</Button>
          </form>
          <div className="pt-2 border-t text-center"><p className="text-sm text-muted-foreground">Don't have an account? <Link to="/auth/register" className="text-orange-500 font-semibold hover:underline">Register</Link></p></div>
        </CardContent></Card>
        <div className="mt-8 text-center text-xs text-muted-foreground"><div className="flex gap-2 items-center justify-center"><Shield className="h-3.5 w-3.5" /><span>Your data is secure and encrypted</span></div></div>
      </div>
    </div>
  )
}