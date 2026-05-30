// src/App.jsx — Full app with all routes wired up
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Suspense, useEffect } from 'react'
import { useAuthStore, useUIStore } from '@/store'
import { initSocket, disconnectSocket } from '@/lib/socket'
import { Navbar } from '@/components/shared/Navbar'
import { BottomNav } from '@/components/shared/BottomNav'
import { PageLoader } from '@/components/shared'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import CompleteProfilePage from '@/pages/auth/CompleteProfilePage'

// Main pages
import HomePage from '@/pages/home/HomePage'
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

// Wallet
import WalletPage from '@/pages/wallet/WalletPage'

// Admin
import AdminDashboard from '@/pages/admin/AdminDashboard'

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

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? children : <Navigate to="/" replace />
}

function App() {
  const { isAuthenticated, token } = useAuthStore()
  const { theme } = useUIStore()

  useEffect(() => {
    if (isAuthenticated && token) {
      initSocket(token)
    } else {
      disconnectSocket()
    }
  }, [isAuthenticated, token])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        {isAuthenticated && <Navbar />}

        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/auth/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />

            {/* Main app routes */}
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

            {/* Product routes */}
            <Route path="/products/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
            <Route path="/sell/add" element={<SellerRoute><AddProductPage /></SellerRoute>} />
            <Route path="/sell/my-products" element={<SellerRoute><MyProductsPage /></SellerRoute>} />

            {/* Order routes */}
            <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />

            {/* Chat routes */}
            <Route path="/chat" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />

            {/* Shop routes */}
            <Route path="/shop/register" element={<ProtectedRoute><RegisterShopPage /></ProtectedRoute>} />
            <Route path="/shop/dashboard" element={<SellerRoute><ShopDashboardPage /></SellerRoute>} />
            <Route path="/shop/settings" element={<SellerRoute><ShopSettingsPage /></SellerRoute>} />
            <Route path="/shop/analytics" element={<SellerRoute><AnalyticsPage /></SellerRoute>} />

            {/* Wallet */}
            <Route path="/wallet" element={<SellerRoute><WalletPage /></SellerRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {isAuthenticated && <BottomNav />}

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
      </div>
    </BrowserRouter>
  )
}

export default App
