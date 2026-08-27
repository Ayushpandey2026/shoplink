// src/pages/shop/RegisterShopPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { MapPin, Store, CheckCircle2, Navigation } from 'lucide-react'
import {
  Button, Input, Label, Card, CardContent, CardHeader, CardTitle,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge
} from '@/components/ui'
import { PageWrapper, LoadingSpinner } from '@/components/shared'
import { authAPI, shopAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import toast from 'react-hot-toast'

const SHOP_TYPES = [
  { value: 'kirana', label: 'Kirana Store', emoji: '🛒' },
  { value: 'hardware', label: 'Hardware Shop', emoji: '🔧' },
  { value: 'medical', label: 'Medical / Pharmacy', emoji: '💊' },
  { value: 'electronics', label: 'Electronics', emoji: '📱' },
  { value: 'clothing', label: 'Clothing', emoji: '👗' },
  { value: 'stationary', label: 'Stationery', emoji: '📚' },
  { value: 'other', label: 'Other', emoji: '🏪' },
]

const ALL_CATEGORIES = [
  'grocery','snacks','beverages','dairy','hardware','tools',
  'electrical','plumbing','medicines','cosmetics','electronics',
  'stationery','clothing','footwear','other'
]

const STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan',
  'Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal'
]

export default function RegisterShopPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { updateUser } = useAuthStore()

  const [shopType, setShopType] = useState('')
  const [categories, setCategories] = useState([])
  const [location, setLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [logo, setLogo] = useState(null)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm()

  const captureLocation = () => {
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setLocLoading(false)
        toast.success('Location captured!')
      },
      err => {
        toast.error('Could not get location. Please allow access.')
        setLocLoading(false)
      }
    )
  }

  const toggleCategory = (cat) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const onSubmit = async (data) => {
    if (!shopType) return toast.error('Please select shop type')
    if (categories.length === 0) return toast.error('Select at least one category')
    if (!location) return toast.error('Please capture your shop location')

    setSubmitting(true)
    try {
      const formData = new FormData()

      // Text fields
      formData.append('name', data.name)
      formData.append('shopType', shopType)
      categories.forEach(c => formData.append('categories[]', c))
      formData.append('address[line1]', data.addressLine1)
      formData.append('address[city]', data.city)
      formData.append('address[state]', data.state)
      formData.append('address[pincode]', String(data.pincode)) // Pincode ko bhi string mein safely convert karo
      if (data.landmark) formData.append('address[landmark]', data.landmark)
      formData.append('location[latitude]', String(location.latitude))
      formData.append('location[longitude]', String(location.longitude))
      if (data.gstNumber) formData.append('gstNumber', data.gstNumber)

      // Always convert phone to String explicitly
      if (data.phone) {
        formData.append('phone', String(data.phone).trim())
      }

      // Logo
      if (logo) formData.append('logo', logo)

      // Register shop
      const registerRes = await shopAPI.register(formData)

      // Try to use returned user from register response, otherwise refetch via getMe
      let updatedUser = registerRes?.data?.user ?? registerRes?.user ?? null
      if (!updatedUser) {
        const profile = await authAPI.getMe()
        updatedUser = profile?.data?.user ?? profile?.user ?? null
      }

      // As a final fallback, force a fresh fetch and set minimal role if backend is slow
      if (!updatedUser) {
        const profile = await authAPI.getMe()
        updatedUser = profile?.data?.user ?? profile?.user ?? { role: 'seller' }
      }

      // Update local auth store so UI reflects new role immediately
      if (updatedUser) updateUser(updatedUser)

      toast.success('Shop registered! Verification pending.')
      navigate('/shop/dashboard')
    } catch (err) {
      toast.error(err?.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-2">
          <div className="h-14 w-14 bg-orange-100 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="h-7 w-7 text-orange-500" />
          </div>
          <h1 className="text-xl font-bold">{t('shop.register_shop')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register your shop to start selling dead stock
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Shop Information</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Shop Logo */}
              <div className="space-y-1.5">
                <Label>Shop Logo (Optional)</Label>
                <div className="flex items-center gap-3">
                  {logo ? (
                    <img src={URL.createObjectURL(logo)} className="h-16 w-16 rounded-xl object-cover border" alt="" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                      <Store className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('logo-input').click()}>
                    Upload Logo
                  </Button>
                  <input id="logo-input" type="file" accept="image/*" className="hidden" onChange={e => setLogo(e.target.files[0])} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t('shop.shop_name')} *</Label>
                <Input placeholder="e.g. Sharma Kirana Store" {...register('name', { required: 'Shop name required' })} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              {/* Shop Type */}
              <div className="space-y-1.5">
                <Label>{t('shop.shop_type')} *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SHOP_TYPES.map(st => (
                    <button
                      type="button" key={st.value}
                      onClick={() => setShopType(st.value)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
                        shopType === st.value
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 font-medium'
                          : 'border-border hover:border-orange-300'
                      }`}
                    >
                      <span>{st.emoji}</span>{st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-1.5">
                <Label>{t('shop.categories')} * <span className="text-muted-foreground font-normal">(select all that apply)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map(cat => (
                    <button
                      type="button" key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        categories.includes(cat)
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-border hover:border-orange-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {categories.length === 0 && <p className="text-xs text-muted-foreground">Select categories you sell</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Business Phone (Optional)</Label>
                <Input type="tel" maxLength={10} placeholder="Business mobile number" {...register('phone')} inputMode="numeric" />
              </div>

              <div className="space-y-1.5">
                <Label>GST Number (Optional)</Label>
                <Input placeholder="22AAAAA0000A1Z5" {...register('gstNumber')} className="uppercase" />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('shop.address')}</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-1.5">
                <Label>Address Line *</Label>
                <Input placeholder="Shop no., Street, Area" {...register('addressLine1', { required: 'Address required' })} />
                {errors.addressLine1 && <p className="text-xs text-destructive">{errors.addressLine1.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Landmark (Optional)</Label>
                <Input placeholder="Near clock tower, etc." {...register('landmark')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City *</Label>
                  <Input placeholder="City" {...register('city', { required: 'City required' })} />
                  {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Pincode *</Label>
                  <Input placeholder="000000" maxLength={6} inputMode="numeric" {...register('pincode', { required: true, pattern: /^\d{6}$/ })} />
                  {errors.pincode && <p className="text-xs text-destructive">Valid 6-digit pincode</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>State *</Label>
                <Select onValueChange={v => setValue('state', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location Capture */}
          <Card className={location ? 'border-green-200 dark:border-green-900' : 'border-orange-200'}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${location ? 'bg-green-100 dark:bg-green-950/30' : 'bg-orange-100 dark:bg-orange-950/30'}`}>
                    <MapPin className={`h-5 w-5 ${location ? 'text-green-600' : 'text-orange-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('shop.location')}</p>
                    {location ? (
                      <p className="text-xs text-green-600">
                        {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Required for nearby search</p>
                    )}
                  </div>
                </div>
                {location ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <Button type="button" variant="ghost" size="sm" onClick={captureLocation}>Re-capture</Button>
                  </div>
                ) : (
                  <Button type="button" onClick={captureLocation} disabled={locLoading} size="sm" className="gap-1.5">
                    {locLoading ? <LoadingSpinner size="sm" /> : <Navigation className="h-4 w-4" />}
                    {locLoading ? 'Getting...' : 'Capture'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? 'Registering Shop...' : '🏪 Register Shop'}
          </Button>
        </form>
      </div>
    </PageWrapper>
  )
}
