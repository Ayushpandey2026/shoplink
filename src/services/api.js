// src/services/api.js — Axios instance with auth interceptors
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  withCredentials: true,
})

const getStoredToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('shoplink_token') || localStorage.getItem('accessToken') || null
}

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken()

    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }

    config.withCredentials = true
    return config
  },
  (error) => Promise.reject(error)
);

//// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response.data, // Returns response.data directly for successful requests
  async (error) => {
    const { response } = error;
    const originalRequest = error.config;

    // 🎯 401 Unauthorized handling — Token Expired
    if (response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check both keys to prevent storage key mismatch bugs
      const refreshToken = 
        localStorage.getItem('shoplink_refresh_token') || 
        localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          console.log("🔄 Access token expired. Attempting token refresh...");

          // 🎯 Fix: Uses the internal api instance config to inherit correct baseURL (Port 5000)
          const res = await api.post('/auth/refresh-token', { refreshToken });
          
          // 🎯 Fix: Fallback parsing to match both { data: { accessToken } } or direct response schema
          const newToken = res?.data?.accessToken || res?.accessToken;

          if (newToken) {
            console.log("✅ Token refreshed successfully!");
            
            // Sync both possible local storage naming formats
            localStorage.setItem('shoplink_token', newToken);
            localStorage.setItem('accessToken', newToken);

            // Re-attach new token to original headers and retry request
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            originalRequest.withCredentials = true
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error("❌ Refresh token failed or expired. Forcing logout.");
          localStorage.clear();
          window.location.href = '/auth/login';
          return Promise.reject(refreshError);
        }
      } else {
        console.warn("⚠️ No refresh token found. Routing to login.");
        localStorage.clear();
        window.location.href = '/auth/login';
      }
    }

    // 🎯 Error Message Extraction & User Notifications
    // Checks standard backend AppError wrapper or generic network error messages
    const message = response?.data?.message || response?.message || error.message || 'Something went wrong';
    
    // Toast only for genuine errors, skip 401 to avoid unnecessary spam during re-authentication routing
    if (response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(response?.data || error);
  }
);

// ── Auth APIs ─────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  sendOTP: (data) => api.post('/auth/send-otp', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  googleLogin: (data) => api.post('/auth/google-login', data),
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
  getProducts: (params, config = {}) => api.get('/products', { params, ...config }),
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
