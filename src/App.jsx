// src/App.jsx — Full app with all routes wired up
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Suspense, useEffect } from 'react'
import { useAuthStore, useUIStore, useNotificationStore } from '@/store'
import { authAPI, notificationAPI } from '@/services/api'
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { Navbar } from '@/components/shared/Navbar'
import { BottomNav } from '@/components/shared/BottomNav'
import { PageLoader } from '@/components/shared'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import CompleteProfilePage from '@/pages/auth/CompleteProfilePage'

// Main pages
import HomePage from '@/pages/home/HomePage'
import DeadStockMapPage from '@/pages/map/DeadStockMapPage'
import ShopDeadStockPage from '@/pages/shop/ShopDeadStockPage'
import ProfilePage from '@/pages/profile/ProfilePage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'

// Product pages
import ProductDetailPage from '@/pages/product/ProductDetailPage'
import AddProductPage from '@/pages/product/AddProductPage'
import MyProductsPage from '@/pages/product/MyProductsPage'

// Order pages
import OrdersPage from '@/pages/order/OrdersPage'
import OrderDetailPage from '@/pages/order/OrderDetailPage'

// Chat pages
import { ConversationsPage, ConversationPage } from '@/pages/chat/ChatPage'

// Shop pages
import RegisterShopPage from '@/pages/shop/RegisterShopPage'
import ShopDashboardPage from '@/pages/shop/ShopDashboardPage'
import ShopSettingsPage from '@/pages/shop/ShopSettingsPage'
import AnalyticsPage from '@/pages/shop/AnalyticsPage'
import BuyerAnalyticsPage from '@/pages/buyer/BuyerAnalyticsPage'
import ShopLinkPlusPage from '@/pages/buyer/ShopLinkPlusPage'
import PrivacySecurityPage from '@/pages/privacy/PrivacySecurityPage'
import HelpCenterPage from '@/pages/support/HelpCenterPage'
import SupportTicketPage from '@/pages/support/SupportTicketPage'
import AdminSupportPage from '@/pages/admin/AdminSupportPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Wallet
import WalletPage from '@/pages/wallet/WalletPage'

// Admin
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'

// Route guards
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/auth/login" replace />
}

const SellerRoute = ({ children }) => {
  const { isAuthenticated, isSeller } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  if (!isSeller) return <Navigate to="/shop/register" replace />
  return children
}

const RegisterShopRoute = ({ children }) => {
  const { isAuthenticated, isSeller } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  if (isSeller) return <Navigate to="/shop/dashboard" replace />
  return children
}

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

const AppLayout = ({ children, isAuthenticated }) => {
  const { pathname } = useLocation()
  const isAdminPath = pathname.startsWith('/admin')
  return (
    <div className={`min-h-screen bg-background text-foreground ${isAuthenticated && !isAdminPath ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0' : ''}`}>
      {!isAdminPath && <Navbar />}
      {children}
      {!isAdminPath && isAuthenticated && <BottomNav />}
    </div>
  )
}

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? children : <Navigate to="/" replace />
}

const NotFoundPage = () => (
  <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
    <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">404</p>
    <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
    <p className="mt-2 text-sm text-muted-foreground">The page you are looking for does not exist.</p>
    <Link
      to="/"
      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-orange-500 px-5 font-medium text-white hover:bg-orange-600"
    >
      Go home
    </Link>
  </main>
)

function App() {
  const { isAuthenticated, token, user, updateUser } = useAuthStore()
  const { theme } = useUIStore()

  useEffect(() => {
    if (isAuthenticated && token) {
      initSocket(token)
    } else {
      disconnectSocket()
    }
  }, [isAuthenticated, token])

  useEffect(() => {
    if (!isAuthenticated || !token) return

    authAPI.getMe()
      .then((response) => {
        const currentUser = response?.data?.user
        if (currentUser) updateUser(currentUser)
      })
      .catch(() => {})
  }, [isAuthenticated, token, updateUser])

  useEffect(() => {
    const notificationStore = useNotificationStore.getState()
    if (!isAuthenticated || !token) {
      notificationStore.setNotifications([])
      notificationStore.setUnreadCount(0)
      return
    }

    notificationStore.setNotifications([])
    notificationStore.setUnreadCount(0)
    let active = true
    let requestSequence = 0
    const syncUnreadCount = async () => {
      const requestId = ++requestSequence
      try {
        const response = await notificationAPI.getUnreadCount()
        if (active && requestId === requestSequence) {
          useNotificationStore.getState().setUnreadCount(Number(response?.data?.unreadCount) || 0)
        }
      } catch {
        // Keep the last known count if the API is temporarily unavailable.
      }
    }

    const handleNewNotification = (notification) => {
      const recipientId = notification?.recipient?._id || notification?.recipient
      const currentUserId = user?._id || user?.id
      if (recipientId && currentUserId && String(recipientId) !== String(currentUserId)) return
      if (notification) useNotificationStore.getState().addNotification(notification)
      syncUnreadCount()
    }

    syncUnreadCount()
    const socket = getSocket()
    socket?.on('notification:new', handleNewNotification)

    return () => {
      active = false
      socket?.off('notification:new', handleNewNotification)
    }
  }, [isAuthenticated, token, user?._id, user?.id])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <BrowserRouter>
      <AppLayout isAuthenticated={isAuthenticated}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/auth/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/auth/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />

            {/* Main app routes - Home page is PUBLIC (viewable without auth) */}
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<DeadStockMapPage />} />
            <Route path="/shops/:shopId/stock" element={<ShopDeadStockPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/buyer/analytics" element={<ProtectedRoute><BuyerAnalyticsPage /></ProtectedRoute>} />
            <Route path="/plus" element={<ProtectedRoute><ShopLinkPlusPage /></ProtectedRoute>} />
            <Route path="/privacy-security" element={<ProtectedRoute><PrivacySecurityPage /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><HelpCenterPage /></ProtectedRoute>} />
            <Route path="/support/:id" element={<ProtectedRoute><SupportTicketPage /></ProtectedRoute>} />

            {/* Product routes */}
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/sell/add" element={<SellerRoute><AddProductPage /></SellerRoute>} />
            <Route path="/sell/my-products" element={<SellerRoute><MyProductsPage /></SellerRoute>} />

            {/* Order routes */}
            <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />

            {/* Chat routes */}
            <Route path="/chat" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />

            {/* Shop routes */}
            <Route path="/shop/register" element={<RegisterShopRoute><RegisterShopPage /></RegisterShopRoute>} />
            <Route path="/shop/dashboard" element={<SellerRoute><ShopDashboardPage /></SellerRoute>} />
            <Route path="/shop/settings" element={<SellerRoute><ShopSettingsPage /></SellerRoute>} />
            <Route path="/shop/analytics" element={<SellerRoute><AnalyticsPage /></SellerRoute>} />

            {/* Wallet */}
            <Route path="/wallet" element={<SellerRoute><WalletPage /></SellerRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/support" element={<AdminRoute><AdminSupportPage /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

        <Toaster
          position="top-center"
          gutter={8}
          toastOptions={{
            duration: 3500,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
