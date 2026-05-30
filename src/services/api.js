// src/services/api.js — Axios instance with auth interceptors
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  withCredentials: true,
})

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shoplink_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const { response } = error

    if (response?.status === 401) {
      // Try refresh token
      const refreshToken = localStorage.getItem('shoplink_refresh_token')
      if (refreshToken && !error.config._retry) {
        error.config._retry = true
        try {
          const res = await axios.post('/api/auth/refresh-token', { refreshToken })
          const newToken = res.data?.data?.accessToken
          if (newToken) {
            localStorage.setItem('shoplink_token', newToken)
            error.config.headers.Authorization = `Bearer ${newToken}`
            return api(error.config)
          }
        } catch {
          // Refresh failed — force logout
          localStorage.clear()
          window.location.href = '/auth/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/auth/login'
      }
    }

    const message = response?.data?.message || 'Something went wrong'
    if (response?.status !== 401) {
      toast.error(message)
    }

    return Promise.reject(response?.data || error)
  }
)

// ── Auth APIs ─────────────────────────────────────────────────────
export const authAPI = {
  sendOTP: (data) => api.post('/auth/send-otp', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  completeRegistration: (data) => api.post('/auth/complete-registration', data),
  refreshToken: (data) => api.post('/auth/refresh-token', data),
  logout: (data) => api.post('/auth/logout', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  registerFCMToken: (data) => api.post('/auth/fcm-token', data),
}

// ── Shop APIs ─────────────────────────────────────────────────────
export const shopAPI = {
  register: (data) => api.post('/shops/register', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMyShop: () => api.get('/shops/my'),
  updateShop: (data) => api.put('/shops/my', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getShopById: (id) => api.get(`/shops/${id}`),
  getNearbyShops: (params) => api.get('/shops/nearby', { params }),
  toggleStatus: () => api.patch('/shops/toggle-status'),
  getAnalytics: () => api.get('/shops/analytics'),
  updateBankDetails: (data) => api.put('/shops/bank-details', data),
}

// ── Product APIs ──────────────────────────────────────────────────
export const productAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  getMyProducts: (params) => api.get('/products/my', { params }),
  createProduct: (data) => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateProduct: (id, data) => api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  scanBarcode: (data) => api.post('/products/scan-barcode', data),
  getOptimization: (id) => api.get(`/products/${id}/optimize`),
  deleteImage: (id, publicId) => api.delete(`/products/${id}/images/${encodeURIComponent(publicId)}`),
}

// ── Order APIs ────────────────────────────────────────────────────
export const orderAPI = {
  createOrder: (data) => api.post('/orders', data),
  verifyPayment: (data) => api.post('/orders/verify-payment', data),
  getBuyerOrders: (params) => api.get('/orders/buyer', { params }),
  getSellerOrders: (params) => api.get('/orders/seller', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
  cancelOrder: (id, data) => api.patch(`/orders/${id}/cancel`, data),
}

// ── Chat APIs ─────────────────────────────────────────────────────
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getOrCreateConversation: (data) => api.post('/chat/conversations', data),
  getMessages: (conversationId, params) => api.get(`/chat/${conversationId}/messages`, { params }),
  sendMessage: (conversationId, data) => api.post(`/chat/${conversationId}/messages`, data),
  getUnreadCount: () => api.get('/chat/unread'),
}

// ── Wallet APIs ───────────────────────────────────────────────────
export const walletAPI = {
  getWallet: () => api.get('/wallet'),
  getTransactions: (params) => api.get('/wallet/transactions', { params }),
  requestWithdrawal: (data) => api.post('/wallet/withdraw', data),
}

// ── Review APIs ───────────────────────────────────────────────────
export const reviewAPI = {
  createReview: (data) => api.post('/reviews', data),
  getShopReviews: (shopId, params) => api.get(`/reviews/shop/${shopId}`, { params }),
  replyToReview: (id, data) => api.put(`/reviews/${id}/reply`, data),
}

// ── Notification APIs ─────────────────────────────────────────────
export const notificationAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (data) => api.patch('/notifications/read', data),
}

// ── Admin APIs ────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  banUser: (id, data) => api.patch(`/admin/users/${id}/ban`, data),
  getShops: (params) => api.get('/admin/shops', { params }),
  verifyShop: (id) => api.patch(`/admin/shops/${id}/verify`),
}

export default api
