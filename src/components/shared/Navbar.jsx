// src/components/shared/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, MessageSquare, Menu, ShoppingBag, Moon, Sun, Globe } from 'lucide-react'
import { useAuthStore, useUIStore, useNotificationStore } from '@/store'
import { Button, Avatar, AvatarImage, AvatarFallback, Badge } from '@/components/ui'
import { authAPI } from '@/services/api'
import { disconnectSocket } from '@/lib/socket'
import toast from 'react-hot-toast'

export const Navbar = () => {
  const { t, i18n } = useTranslation()
  const { user, logout, isAuthenticated } = useAuthStore()
  const { theme, setTheme, setLanguage, unreadMessages } = useUIStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authAPI.logout({})
    } catch {}
    disconnectSocket()
    logout()
    navigate('/auth/login')
    toast.success('Logged out successfully')
  }

  const toggleLang = () => {
    const newLang = i18n.language === 'hi' ? 'en' : 'hi'
    i18n.changeLanguage(newLang)
    setLanguage(newLang)
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-orange-500">
          <ShoppingBag className="h-6 w-6" />
          <span className="hidden sm:block">ShopLink</span>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Language Toggle */}
          <Button variant="ghost" size="icon-sm" onClick={toggleLang} title="Toggle Language">
            <Globe className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon-sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isAuthenticated && (
            <>
              {/* Chat */}
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/chat')} className="relative">
                <MessageSquare className="h-4 w-4" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/notifications')} className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* Avatar / Profile */}
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/profile')}>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar?.url} />
                  <AvatarFallback className="text-xs">{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </>
          )}

          {!isAuthenticated && (
            <Button size="sm" onClick={() => navigate('/auth/login')}>
              {t('auth.login')}
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
