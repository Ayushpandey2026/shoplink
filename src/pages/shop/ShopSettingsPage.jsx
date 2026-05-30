// src/pages/shop/ShopSettingsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { CreditCard, Truck, Clock, ChevronLeft, Save } from 'lucide-react'
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Input, Label, Switch, Separator
} from '@/components/ui'
import { PageWrapper, LoadingSpinner } from '@/components/shared'
import { shopAPI } from '@/services/api'
import toast from 'react-hot-toast'

export default function ShopSettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shop, setShop] = useState(null)

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await shopAPI.getMyShop()
        setShop(res.data.shop)
        reset({
          accountHolderName: res.data.shop?.bankDetails?.accountHolderName || '',
          accountNumber: res.data.shop?.bankDetails?.accountNumber || '',
          ifscCode: res.data.shop?.bankDetails?.ifscCode || '',
          bankName: res.data.shop?.bankDetails?.bankName || '',
          upiId: res.data.shop?.bankDetails?.upiId || '',
          minimumOrderValue: res.data.shop?.settings?.minimumOrderValue || 0,
          normalDeliveryCharge: res.data.shop?.settings?.normalDeliveryCharge || 20,
          urgentDeliveryCharge: res.data.shop?.settings?.urgentDeliveryCharge || 50,
          deliveryRadius: res.data.shop?.settings?.deliveryRadius || 5,
        })
      } catch {} finally { setLoading(false) }
    }
    fetch()
  }, [])

  const [deliverySettings, setDeliverySettings] = useState({
    acceptsDelivery: true,
    acceptsUrgentDelivery: false,
    autoAcceptOrders: false,
  })

  useEffect(() => {
    if (shop?.settings) {
      setDeliverySettings({
        acceptsDelivery: shop.settings.acceptsDelivery ?? true,
        acceptsUrgentDelivery: shop.settings.acceptsUrgentDelivery ?? false,
        autoAcceptOrders: shop.settings.autoAcceptOrders ?? false,
      })
    }
  }, [shop])

  const handleSaveBankDetails = async (data) => {
    setSaving(true)
    try {
      await shopAPI.updateBankDetails({
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
        upiId: data.upiId,
      })
      toast.success('Bank details saved!')
    } catch { toast.error('Failed to save bank details') } finally { setSaving(false) }
  }

  const handleSaveDelivery = async (data) => {
    setSaving(true)
    try {
      await shopAPI.updateShop({
        settings: {
          ...deliverySettings,
          minimumOrderValue: Number(data.minimumOrderValue),
          normalDeliveryCharge: Number(data.normalDeliveryCharge),
          urgentDeliveryCharge: Number(data.urgentDeliveryCharge),
          deliveryRadius: Number(data.deliveryRadius),
        }
      })
      toast.success('Delivery settings saved!')
    } catch { toast.error('Failed to save settings') } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/shop/dashboard')}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Shop Settings</h1>
      </div>

      <form className="space-y-4">
        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-500" />
              {t('shop.bank_details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1.5">
              <Label>Account Holder Name</Label>
              <Input placeholder="As per bank records" {...register('accountHolderName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Account Number</Label>
              <Input placeholder="Bank account number" {...register('accountNumber')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>IFSC Code</Label>
                <Input placeholder="SBIN0001234" className="uppercase" {...register('ifscCode')} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input placeholder="SBI, HDFC..." {...register('bankName')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>UPI ID (Alternative)</Label>
              <Input placeholder="yourname@upi" {...register('upiId')} />
            </div>
            <Button
              type="button"
              onClick={handleSubmit(handleSaveBankDetails)}
              disabled={saving}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              Save Bank Details
            </Button>
          </CardContent>
        </Card>

        {/* Delivery Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-500" />
              Delivery Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {[
              { key: 'acceptsDelivery', label: 'Accept Normal Delivery', desc: 'Allow buyers to request delivery' },
              { key: 'acceptsUrgentDelivery', label: 'Accept Urgent Delivery', desc: 'Same-day delivery option' },
              { key: 'autoAcceptOrders', label: 'Auto-Accept Orders', desc: 'Automatically accept incoming orders' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={deliverySettings[key]}
                  onCheckedChange={v => setDeliverySettings(s => ({ ...s, [key]: v }))}
                />
              </div>
            ))}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Order Value (₹)</Label>
                <Input type="number" placeholder="0" {...register('minimumOrderValue')} />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Radius (km)</Label>
                <Input type="number" placeholder="5" {...register('deliveryRadius')} />
              </div>
              <div className="space-y-1.5">
                <Label>Normal Delivery (₹)</Label>
                <Input type="number" placeholder="20" {...register('normalDeliveryCharge')} />
              </div>
              <div className="space-y-1.5">
                <Label>Urgent Delivery (₹)</Label>
                <Input type="number" placeholder="50" {...register('urgentDeliveryCharge')} />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSubmit(handleSaveDelivery)}
              disabled={saving}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              Save Delivery Settings
            </Button>
          </CardContent>
        </Card>
      </form>
    </PageWrapper>
  )
}
