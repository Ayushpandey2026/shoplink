// src/pages/notifications/NotificationsPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { Button, Badge, Card, CardContent } from '@/components/ui'
import { PageWrapper, EmptyState, LoadingSpinner } from '@/components/shared'
import { notificationAPI } from '@/services/api'
import { useNotificationStore } from '@/store'
import { formatDistanceToNow } from 'date-fns'

const typeIcon = {
  order_placed: '🛒', order_accepted: '✅', order_rejected: '❌',
  order_dispatched: '🚚', order_delivered: '📦', order_completed: '🎉',
  order_cancelled: '🚫', payment_received: '💰', payment_released: '💸',
  expiry_30d: '⚠️', expiry_15d: '⚠️', expiry_7d: '🚨',
  new_message: '💬', new_review: '⭐', shop_verified: '✅',
  withdrawal_processed: '🏦', system: '📢', promotion: '🎁',
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const { setUnreadCount } = useNotificationStore()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setLocalUnread] = useState(0)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications({ limit: 50 })
      setNotifications(res.data.notifications || [])
      setLocalUnread(res.data.unreadCount || 0)
    } catch {} finally { setLoading(false) }
  }

  const markAllRead = async () => {
    try {
      await notificationAPI.markAsRead({ ids: 'all' })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setLocalUnread(0)
      setUnreadCount(0)
    } catch {}
  }

  const markOneRead = async (id) => {
    try {
      await notificationAPI.markAsRead({ ids: [id] })
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
      setLocalUnread(prev => Math.max(0, prev - 1))
    } catch {}
  }

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">{t('nav.notifications')}</h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-xs">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No notifications"
          description="You'll see order updates, expiry alerts and messages here"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <Card
              key={notif._id}
              onClick={() => !notif.isRead && markOneRead(notif._id)}
              className={`cursor-pointer transition-colors ${!notif.isRead ? 'border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/10' : ''}`}
            >
              <CardContent className="p-3 flex gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-lg">
                  {typeIcon[notif.type] || '📢'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold' : 'font-medium'}`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
