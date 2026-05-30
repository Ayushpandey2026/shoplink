// src/pages/product/AddProductPage.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Camera, X, Plus, Sparkles, Package, ChevronDown,
  AlertCircle, CheckCircle2, Barcode, Image as ImageIcon
} from 'lucide-react'
import {
  Button, Input, Label, Textarea, Select, SelectTrigger,
  SelectValue, SelectContent, SelectItem, Card, CardContent,
  CardHeader, CardTitle, Badge, Alert, AlertDescription,
  Dialog, DialogContent, DialogHeader, DialogTitle, Switch
} from '@/components/ui'
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner'
import { PageWrapper, LoadingSpinner } from '@/components/shared'
import { productAPI } from '@/services/api'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Product name required').max(200),
  brand: z.string().optional(),
  category: z.string().min(1, 'Category required'),
  mrp: z.coerce.number().positive('MRP must be positive'),
  sellingPrice: z.coerce.number().positive('Selling price required'),
  quantity: z.coerce.number().int().positive('Quantity required'),
  unit: z.string().default('piece'),
  minimumOrderQuantity: z.coerce.number().int().min(1).default(1),
  minimumOrderValue: z.coerce.number().min(0).default(0),
  description: z.string().optional(),
  listingType: z.string().default('dead_stock'),
  expiryDate: z.string().optional(),
  manufacturingDate: z.string().optional(),
  barcode: z.string().optional(),
})

const CATEGORIES = [
  'grocery','snacks','beverages','dairy','hardware','tools',
  'electrical','plumbing','medicines','cosmetics','electronics',
  'stationery','clothing','footwear','other'
]
const UNITS = ['piece','kg','gram','liter','ml','pack','box','dozen','set']
const LISTING_TYPES = [
  { value: 'dead_stock', label: 'Dead Stock', emoji: '📦' },
  { value: 'excess_inventory', label: 'Excess Inventory', emoji: '🏪' },
  { value: 'clearance', label: 'Clearance Sale', emoji: '🏷️' },
  { value: 'regular', label: 'Regular Listing', emoji: '✅' },
]

export default function AddProductPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [images, setImages] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [deliveryOptions, setDeliveryOptions] = useState({
    selfPickup: true, normalDelivery: false, urgentDelivery: false,
  })
  const [aiSuggestions, setAiSuggestions] = useState(null)

  const fileInputRef = useRef(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { unit: 'piece', listingType: 'dead_stock', minimumOrderQuantity: 1, minimumOrderValue: 0 },
  })

  const mrp = watch('mrp')
  const sellingPrice = watch('sellingPrice')
  const discountPercent = mrp && sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0

  // ── Barcode scan handler ──────────────────────────────────────
  const handleBarcodeScan = async ({ barcode, barcodeType }) => {
    setShowScanner(false)
    setScanLoading(true)
    setScanResult(null)

    try {
      const res = await productAPI.scanBarcode({ barcode, barcodeType })

      if (res.found && res.data) {
        const d = res.data
        // Auto-fill form fields
        if (d.name) setValue('name', d.name)
        if (d.brand) setValue('brand', d.brand)
        if (d.category) setValue('category', d.category)
        if (d.typicalMRP) setValue('mrp', d.typicalMRP)
        if (d.description) setValue('description', d.description)
        setValue('barcode', barcode)

        setScanResult({ found: true, data: d })
        toast.success(t('product.barcode_found'))
      } else {
        setScanResult({ found: false })
        setValue('barcode', barcode)
        toast(t('product.barcode_not_found'), { icon: 'ℹ️' })
      }
    } catch {
      toast.error('Barcode lookup failed')
    } finally {
      setScanLoading(false)
    }
  }

  // ── Image handling ────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).slice(2),
    }))
    setImages((prev) => [...prev, ...newImages])
  }

  const removeImage = (id) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (img?.preview) URL.revokeObjectURL(img.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  // ── Submit ────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    if (data.sellingPrice > data.mrp) {
      toast.error('Selling price cannot exceed MRP')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()

      // Append all text fields
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== '') formData.append(key, val)
      })

      // Delivery options
      formData.append('deliveryOptions[selfPickup]', deliveryOptions.selfPickup)
      formData.append('deliveryOptions[normalDelivery]', deliveryOptions.normalDelivery)
      formData.append('deliveryOptions[urgentDelivery]', deliveryOptions.urgentDelivery)

      // Images
      images.forEach((img) => formData.append('images', img.file))

      await productAPI.createProduct(formData)
      toast.success('Product listed successfully! 🎉')
      navigate('/sell/my-products')
    } catch {
      toast.error('Failed to list product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">←</button>
          <h1 className="text-lg font-bold">{t('product.add')}</h1>
        </div>

        {/* Barcode Scanner Section */}
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">{t('product.scan_barcode')}</p>
                  <p className="text-xs text-muted-foreground">Auto-fill product details</p>
                </div>
              </div>
              <Button
                onClick={() => setShowScanner(true)}
                size="sm"
                className="gap-2"
                disabled={scanLoading}
              >
                {scanLoading ? <LoadingSpinner size="sm" /> : <Camera className="h-4 w-4" />}
                Scan
              </Button>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <Alert variant={scanResult.found ? 'success' : 'warning'} className="mt-2">
                {scanResult.found ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  {scanResult.found
                    ? `Found: ${scanResult.data.name} — fields auto-filled! Confidence: ${Math.round((scanResult.data.confidence || 0) * 100)}%`
                    : t('product.barcode_not_found')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Product Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-1.5">
                <Label>{t('product.name')} *</Label>
                <Input placeholder="e.g. Parle-G Biscuit 800g" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('product.brand')}</Label>
                  <Input placeholder="e.g. Parle" {...register('brand')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('product.category')} *</Label>
                  <Select onValueChange={(v) => setValue('category', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Listing Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {LISTING_TYPES.map((lt) => (
                    <label
                      key={lt.value}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        watch('listingType') === lt.value
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                          : 'border-border'
                      }`}
                    >
                      <input type="radio" value={lt.value} {...register('listingType')} className="sr-only" />
                      <span>{lt.emoji}</span>
                      <span className="text-xs font-medium">{lt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t('product.description')}</Label>
                <Textarea placeholder="Brief description of the product..." {...register('description')} rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Pricing</CardTitle>
                {discountPercent > 0 && (
                  <Badge variant="success">{discountPercent}% Discount</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('product.mrp')} *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" {...register('mrp')} />
                  {errors.mrp && <p className="text-xs text-destructive">{errors.mrp.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{t('product.selling_price')} *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" {...register('sellingPrice')} />
                  {errors.sellingPrice && <p className="text-xs text-destructive">{errors.sellingPrice.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5 col-span-1">
                  <Label>{t('product.quantity')} *</Label>
                  <Input type="number" placeholder="0" {...register('quantity')} />
                  {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label>{t('product.unit')}</Label>
                  <Select defaultValue="piece" onValueChange={(v) => setValue('unit', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label>Min Qty</Label>
                  <Input type="number" defaultValue={1} {...register('minimumOrderQuantity')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Dates</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('product.mfg_date')}</Label>
                  <Input type="date" {...register('manufacturingDate')} max={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('product.expiry_date')}</Label>
                  <Input type="date" {...register('expiryDate')} min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('product.photos')} (max 5)</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-[9px] text-center py-0.5">
                        PRIMARY
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-orange-400 transition-colors"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </CardContent>
          </Card>

          {/* Delivery Options */}
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('product.delivery_options')}</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              {[
                { key: 'selfPickup', label: t('product.self_pickup'), desc: 'Buyer picks up from your shop' },
                { key: 'normalDelivery', label: t('product.normal_delivery'), desc: 'Standard delivery (1-2 days)' },
                { key: 'urgentDelivery', label: t('product.urgent_delivery'), desc: 'Same day delivery' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={deliveryOptions[key]}
                    onCheckedChange={(checked) => setDeliveryOptions((prev) => ({ ...prev, [key]: checked }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Listing Product...' : `🚀 ${t('product.save')}`}
          </Button>
        </form>
      </div>

      {/* Barcode Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('product.scan_barcode')}</DialogTitle>
          </DialogHeader>
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setShowScanner(false)}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
