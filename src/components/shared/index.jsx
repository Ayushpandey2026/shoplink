// src/components/shared/index.jsx — Shared utility components
import { useTranslation } from 'react-i18next'
import { Loader2, PackageOpen, WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

// ── Loading Spinner ───────────────────────────────────────────────
export const LoadingSpinner = ({ size = 'md', className }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-orange-500', sizes[size])} />
    </div>
  )
}

// ── Full page loader ──────────────────────────────────────────────
export const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
    <div className="flex flex-col items-center gap-3">
      <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
        <span className="text-white font-bold text-lg">SL</span>
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
    </div>
  </div>
)

// ── Empty State ───────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon = PackageOpen, title, description, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    {title && <h3 className="font-semibold text-base mb-1">{title}</h3>}
    {description && <p className="text-sm text-muted-foreground mb-4 max-w-xs">{description}</p>}
    {action && actionLabel && (
      <Button onClick={action} size="sm">{actionLabel}</Button>
    )}
  </div>
)

// ── Error State ───────────────────────────────────────────────────
export const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{message || t('common.error')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" /> {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

// ── Product Skeleton Card ─────────────────────────────────────────
export const ProductSkeleton = () => (
  <div className="rounded-xl border overflow-hidden">
    <div className="shimmer aspect-square" />
    <div className="p-3 space-y-2">
      <div className="shimmer h-4 rounded w-3/4" />
      <div className="shimmer h-3 rounded w-1/2" />
      <div className="shimmer h-5 rounded w-1/3" />
    </div>
  </div>
)

// ── Page Wrapper with padding for bottom nav ──────────────────────
export const PageWrapper = ({ children, className, noPadding = false }) => (
  <main className={cn('max-w-7xl mx-auto', !noPadding && 'px-4 py-4 pb-24', className)}>
    {children}
  </main>
)

// ── Section Header ────────────────────────────────────────────────
export const SectionHeader = ({ title, onViewAll, viewAllLabel = 'See All' }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="font-semibold text-base">{title}</h2>
    {onViewAll && (
      <button onClick={onViewAll} className="text-xs text-orange-500 font-medium">
        {viewAllLabel}
      </button>
    )}
  </div>
)

// ── Status Badge colors ───────────────────────────────────────────
export const orderStatusVariant = (status) => {
  const map = {
    pending: 'warning',
    accepted: 'blue',
    rejected: 'destructive',
    packed: 'blue',
    dispatched: 'blue',
    delivered: 'success',
    completed: 'success',
    cancelled: 'destructive',
    refunded: 'secondary',
    refund_init: 'warning',
  }
  return map[status] || 'secondary'
}

// Re-export ProductCard from its own file
export { ProductCard } from './ProductCard'
