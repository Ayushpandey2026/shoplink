// src/lib/socket.js — Socket.io client singleton
import { io } from 'socket.io-client'

let socket = null

export const initSocket = (token) => {
  if (socket?.connected) return socket

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => console.log('Socket connected:', socket.id))
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason))
  socket.on('connect_error', (err) => console.error('Socket error:', err.message))

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export default { initSocket, getSocket, disconnectSocket }
