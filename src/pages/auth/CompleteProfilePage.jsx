// src/pages/auth/CompleteProfilePage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Globe, ChevronRight } from 'lucide-react'
import { Button, Input, Label, Card, CardContent } from '@/components/ui'
import { authAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})

export default function CompleteProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { updateUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState(i18n.language || 'hi')

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authAPI.completeRegistration({
        name: data.name,
        email: data.email || undefined,
        language,
      })
      updateUser(res.data.user)
      i18n.changeLanguage(language)
      toast.success('Profile set up! Welcome to ShopLink 🎉')
      navigate('/')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="h-16 w-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <User className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Just a few details to get started</p>
        </div>

        <Card>
          <CardContent className="pt-6 pb-6 px-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Your Name *</Label>
                <Input
                  placeholder="e.g. Ramesh Sharma"
                  {...register('name')}
                  autoFocus
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Email (Optional)</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  {...register('email')}
                />
              </div>

              {/* Language Selector */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4" /> Preferred Language
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'hi', label: 'हिंदी', sub: 'Hindi' },
                    { value: 'en', label: 'English', sub: 'English' },
                  ].map(lang => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => setLanguage(lang.value)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        language === lang.value
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                          : 'border-border hover:border-orange-300'
                      }`}
                    >
                      <p className="font-bold text-base">{lang.label}</p>
                      <p className="text-xs text-muted-foreground">{lang.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? 'Saving...' : 'Continue'}
                {!loading && <ChevronRight className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
