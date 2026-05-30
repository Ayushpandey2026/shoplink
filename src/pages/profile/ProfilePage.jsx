// src/pages/profile/ProfilePage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  User, Store, ShoppingBag, Wallet, Bell, Globe, Moon, Sun,
  LogOut, ChevronRight, Shield, Star, Settings, HelpCircle
} from 'lucide-react'
import { Button, Avatar, AvatarImage, AvatarFallback, Card, CardContent, Switch, Separator, Badge } from '@/components/ui'
import { PageWrapper } from '@/components/shared'
import { useAuthStore, useUIStore } from '@/store'
import { authAPI } from '@/services/api'
import { disconnectSocket } from '@/lib/socket'
import toast from 'react-hot-toast'

const MenuItem = ({ icon: Icon, label, value, onClick, badge, danger = false, rightEl }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 py-3 px-0 hover:opacity-80 transition-opacity active:opacity-60">
    <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100 dark:bg-red-950/30' : 'bg-muted'}`}>
      <Icon className={`h-4 w-4 ${danger ? 'text-red-500' : 'text-muted-foreground'}`} />
    </div>
    <div className="flex-1 text-left">
      <p className={`text-sm font-medium ${danger ? 'text-red-500' : ''}`}>{label}</p>
      {value && <p className="text-xs text-muted-foreground">{value}</p>}
    </div>
    {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
    {rightEl || <ChevronRight className="h-4 w-4 text-muted-foreground" />}
  </button>
)

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, logout, isSeller } = useAuthStore()
  const { theme, setTheme, language, setLanguage } = useUIStore()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return
    setLoggingOut(true)
    try {
      await authAPI.logout({})
    } catch {}
    disconnectSocket()
    logout()
    navigate('/auth/login')
    toast.success('Logged out successfully')
  }

  const toggleLang = () => {
    const newLang = language === 'hi' ? 'en' : 'hi'
    i18n.changeLanguage(newLang)
    setLanguage(newLang)
    toast.success(newLang === 'hi' ? 'हिंदी चुना गया' : 'English selected')
  }

  return (
    <PageWrapper>
      {/* User Card */}
      <Card className="mb-4 bg-gradient-to-br from-orange-500 to-amber-400 border-0 text-white">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/30">
              <AvatarImage src={user?.avatar?.url} />
              <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{user?.name}</h2>
              <p className="text-sm opacity-80">+91 {user?.phone}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/20 text-white border-0 text-xs capitalize">
                  {user?.role}
                </Badge>
                {user?.isPhoneVerified && (
                  <Badge className="bg-white/20 text-white border-0 text-xs">
                    ✓ Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shop Section (Sellers) */}
      {isSeller && (
        <Card className="mb-4">
          <CardContent className="pt-2 pb-2 px-4">
            <MenuItem icon={Store} label={t('shop.my_shop')} value="Manage your shop" onClick={() => navigate('/shop/dashboard')} />
            <Separator />
            <MenuItem icon={ShoppingBag} label="Incoming Orders" value="View & manage buyer orders" onClick={() => navigate('/orders?tab=seller')} />
            <Separator />
            <MenuItem icon={Wallet} label={t('wallet.balance')} value="View earnings & withdraw" onClick={() => navigate('/wallet')} />
            <Separator />
            <MenuItem icon={Star} label={t('shop.analytics')} value="Sales & performance insights" onClick={() => navigate('/shop/analytics')} />
          </CardContent>
        </Card>
      )}

      {/* Register Shop (Buyers) */}
      {!isSeller && (
        <Card className="mb-4 border-orange-200 dark:border-orange-900">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-100 dark:bg-orange-950/30 rounded-xl flex items-center justify-center">
                <Store className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Become a Seller</p>
                <p className="text-xs text-muted-foreground">Register your shop & start selling</p>
              </div>
              <Button size="sm" onClick={() => navigate('/shop/register')}>Register</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card className="mb-4">
        <CardContent className="pt-2 pb-2 px-4">
          {/* Language Toggle */}
          <div className="flex items-center gap-3 py-3">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Language / भाषा</p>
              <p className="text-xs text-muted-foreground">{language === 'hi' ? 'हिंदी' : 'English'}</p>
            </div>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
            >
              {language === 'hi' ? '🇮🇳 EN' : '🇮🇳 हिं'}
            </button>
          </div>
          <Separator />

          {/* Dark Mode */}
          <div className="flex items-center gap-3 py-3">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              {theme === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark' : 'Light'} theme</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
          <Separator />

          <MenuItem icon={Bell} label={t('nav.notifications')} value="Manage notification preferences" onClick={() => navigate('/notifications')} />
          <Separator />
          <MenuItem icon={Shield} label="Privacy & Security" value="Account security settings" onClick={() => {}} />
          <Separator />
          <MenuItem icon={HelpCircle} label="Help & Support" value="FAQs and contact support" onClick={() => {}} />
        </CardContent>
      </Card>

      {/* Admin Panel */}
      {user?.role === 'admin' && (
        <Card className="mb-4">
          <CardContent className="pt-2 pb-2 px-4">
            <MenuItem icon={Settings} label="Admin Panel" value="Manage platform" onClick={() => navigate('/admin')} badge="Admin" />
          </CardContent>
        </Card>
      )}

      {/* App Info */}
      <div className="text-center text-xs text-muted-foreground mb-4 space-y-0.5">
        <p>ShopLink v1.0.0</p>
        <p>Made with ❤️ for Indian small businesses</p>
      </div>

      {/* Logout */}
      <Card>
        <CardContent className="pt-2 pb-2 px-4">
          <MenuItem
            icon={LogOut}
            label={t('auth.logout')}
            onClick={handleLogout}
            danger
            rightEl={loggingOut ? <span className="text-xs text-muted-foreground">...</span> : <ChevronRight className="h-4 w-4 text-red-400" />}
          />
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
