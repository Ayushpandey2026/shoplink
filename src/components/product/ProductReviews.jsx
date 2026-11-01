import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Flag, Pencil, Star, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'
import { reviewAPI } from '@/services/api'
import { useAuthStore } from '@/store'

const StarRating = ({ value, onChange, label }) => (
  <div className="flex items-center gap-1" role="group" aria-label={label}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        aria-label={`${star} star${star === 1 ? '' : 's'}`}
        aria-pressed={value === star}
        onClick={() => onChange(star)}
        className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        <Star className={`h-6 w-6 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
      </button>
    ))}
  </div>
)

const formatReviewDate = (date) => {
  const parsedDate = new Date(date)
  return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toLocaleDateString()
}

export default function ProductReviews({ product }) {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('newest')
  const [ratingFilter, setRatingFilter] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [orderId, setOrderId] = useState('')
  const [images, setImages] = useState([])
  const [editingReview, setEditingReview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const requestId = useRef(0)
  const isOwnListing = Boolean(
    user?._id && String(user._id) === String(product.seller?._id || product.seller || ''),
  )

  useEffect(() => {
    const currentRequest = ++requestId.current
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      reviewAPI.getProductReviews(product._id, {
        page,
        limit: 10,
        sort,
        ...(ratingFilter && { rating: ratingFilter }),
      }).then((response) => {
        if (requestId.current === currentRequest) {
          setData(response.data)
          setOrderId((current) => (
            response.data.eligibleOrders?.some((order) => order._id === current)
              ? current
              : response.data.eligibleOrders?.[0]?._id || ''
          ))
        }
      }).catch((fetchError) => {
        if (requestId.current === currentRequest) {
          setError(fetchError?.message || 'Reviews could not be loaded.')
        }
      }).finally(() => {
        if (requestId.current === currentRequest) setLoading(false)
      })
    }, 0)
    return () => {
      window.clearTimeout(timer)
      requestId.current += 1
    }
  }, [product._id, page, sort, ratingFilter, refreshVersion, isAuthenticated, user?._id])

  const submitReview = async (event) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setSubmissionError('')
    try {
      if (editingReview) {
        await reviewAPI.updateProductReview(product._id, editingReview._id, { rating, comment })
        toast.success('Review updated.')
      } else {
        const formData = new FormData()
        formData.append('orderId', orderId)
        formData.append('rating', String(rating))
        formData.append('comment', comment.trim())
        images.forEach((image) => formData.append('images', image))
        await reviewAPI.createProductReview(product._id, formData)
        toast.success('Verified review submitted.')
      }
      setComment('')
      setRating(5)
      setImages([])
      setEditingReview(null)
      setPage(1)
      setRefreshVersion((version) => version + 1)
    } catch (submitError) {
      setSubmissionError(submitError?.message || 'Your review could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  const beginEdit = (review) => {
    setEditingReview(review)
    setRating(review.rating)
    setComment(review.comment || '')
    document.getElementById(`product-review-form-${product._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete your review? This cannot be undone.')) return
    try {
      await reviewAPI.deleteProductReview(product._id, reviewId)
      toast.success('Review deleted.')
      setEditingReview(null)
      setRefreshVersion((version) => version + 1)
    } catch (deleteError) {
      toast.error(deleteError?.message || 'Could not delete the review.')
    }
  }

  const reportReview = async (reviewId) => {
    try {
      await reviewAPI.report(reviewId)
      toast.success('Review reported for moderation.')
    } catch (reportError) {
      toast.error(reportError?.message || 'Could not report this review.')
    }
  }

  const summary = data?.summary
  const reviews = data?.reviews || []
  const eligibleOrders = data?.eligibleOrders || []
  const myReviews = data?.myReviews || []

  return (
    <section aria-labelledby={`product-reviews-heading-${product._id}`} className="space-y-5">
      <div>
        <h2 id={`product-reviews-heading-${product._id}`} className="text-xl font-bold">Customer Reviews</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ratings and reviews from ShopLink customers.</p>
      </div>

      {summary && (
        <Card>
          <CardContent className="grid gap-5 p-4 sm:grid-cols-[minmax(150px,0.7fr)_1fr] sm:p-6">
            <div className="flex flex-col items-center justify-center">
              <p className="text-4xl font-bold">{summary.count ? summary.average.toFixed(1) : '—'}</p>
              <div className="mt-1 flex" aria-label={`${summary.average} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-4 w-4 ${star <= Math.round(summary.average) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                ))}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            <div className="space-y-2" aria-label="Rating distribution">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.distribution?.[stars] || 0
                const percent = summary.count ? (count / summary.count) * 100 : 0
                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => {
                      setRatingFilter(ratingFilter === String(stars) ? '' : String(stars))
                      setPage(1)
                    }}
                    aria-pressed={ratingFilter === String(stars)}
                    className="flex w-full items-center gap-2 rounded text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    <span className="w-10 shrink-0">{stars} stars</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                    </span>
                    <span className="w-7 text-right text-muted-foreground">{count}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && !isOwnListing && myReviews.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Your reviews</h3>
          {myReviews.map((review) => (
            <div key={review._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{review.rating} / 5 stars</p>
                <p className="line-clamp-1 text-sm text-muted-foreground">{review.comment}</p>
                {!review.isVisible && <p className="text-xs text-muted-foreground">This review is not currently public.</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => beginEdit(review)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteReview(review._id)} aria-label="Delete your review">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAuthenticated && !isOwnListing && (eligibleOrders.length > 0 || editingReview) && (
        <Card id={`product-review-form-${product._id}`}>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div>
              <h3 className="font-semibold">{editingReview ? 'Edit your review' : 'Write a verified-purchase review'}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Verified reviews are available only for completed purchases with released payment.
              </p>
            </div>
            <form onSubmit={submitReview} className="space-y-4">
              {!editingReview && eligibleOrders.length > 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor={`review-order-${product._id}`}>Completed purchase</Label>
                  <select
                    id={`review-order-${product._id}`}
                    value={orderId}
                    onChange={(event) => setOrderId(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    required
                  >
                    {eligibleOrders.map((order) => (
                      <option key={order._id} value={order._id}>
                        {order.orderNumber || 'Completed order'}{order.completedAt ? ` — ${formatReviewDate(order.completedAt)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Rating</Label>
                <StarRating value={rating} onChange={setRating} label="Choose a rating" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`review-comment-${product._id}`}>Your review</Label>
                <textarea
                  id={`review-comment-${product._id}`}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  minLength={3}
                  maxLength={1000}
                  required
                  rows={4}
                  placeholder="Share your experience with this product"
                  className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                />
              </div>
              {!editingReview && (
                <div className="space-y-1.5">
                  <Label htmlFor={`review-images-${product._id}`}>Photos (optional)</Label>
                  <Input
                    id={`review-images-${product._id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => setImages(Array.from(event.target.files || []).slice(0, 3))}
                    className="h-auto py-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Up to 3 JPEG, PNG, or WebP images, 5 MB each.
                  </p>
                </div>
              )}
              {submissionError && <p className="text-sm text-destructive" role="alert">{submissionError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={submitting || !orderId && !editingReview}>
                  {submitting ? 'Saving…' : editingReview ? 'Save changes' : 'Submit review'}
                </Button>
                {editingReview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingReview(null)
                      setComment('')
                      setRating(5)
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && !isOwnListing && !eligibleOrders.length && !myReviews.length && !loading && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Be the first verified buyer to review this product.
        </p>
      )}
      {!isAuthenticated && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <button type="button" onClick={() => navigate('/auth/login')} className="font-medium text-orange-600 hover:underline">
            Sign in
          </button>{' '}
          to write a review after a completed purchase.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Reviews {summary?.count ? `(${summary.count})` : ''}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {ratingFilter && (
            <Button size="sm" variant="ghost" onClick={() => { setRatingFilter(''); setPage(1) }}>
              Clear rating filter
            </Button>
          )}
          <Label htmlFor={`review-sort-${product._id}`} className="text-xs">Sort</Label>
          <select
            id={`review-sort-${product._id}`}
            value={sort}
            onChange={(event) => { setSort(event.target.value); setPage(1) }}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground" role="status">Loading reviews…</p>}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 p-3">
          <p className="text-sm text-destructive" role="alert">{error}</p>
          <Button size="sm" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>Retry</Button>
        </div>
      )}
      {!loading && !error && reviews.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {summary?.count ? 'No reviews match this rating filter.' : 'No reviews yet.'}
        </p>
      )}
      <div className="space-y-3">
        {reviews.map((review) => {
          const isOwner = String(user?._id || '') === String(review.reviewer?._id || '')
          return (
            <Card key={review._id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{review.reviewer?.name || 'ShopLink customer'}</p>
                    <p className="text-xs text-muted-foreground">{formatReviewDate(review.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm font-medium">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {review.rating}
                  </div>
                </div>
                {review.isVerifiedPurchase && (
                  <p className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified purchase
                  </p>
                )}
                {review.comment && <p className="whitespace-pre-wrap text-sm leading-relaxed">{review.comment}</p>}
                {review.sellerReply?.comment && (
                  <div className="rounded-md bg-muted/60 p-3">
                    <p className="text-xs font-semibold">Seller response</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{review.sellerReply.comment}</p>
                    {review.sellerReply.repliedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatReviewDate(review.sellerReply.repliedAt)}
                      </p>
                    )}
                  </div>
                )}
                {review.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.images.map((image, index) => (
                      <img
                        key={image.publicId || image.url}
                        src={image.url}
                        alt={`Customer review photo ${index + 1}`}
                        loading="lazy"
                        className="h-20 w-20 rounded-md border object-cover"
                      />
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {isOwner && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => beginEdit(review)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteReview(review._id)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    </>
                  )}
                  {isAuthenticated && !isOwner && (
                    <Button size="sm" variant="ghost" onClick={() => reportReview(review._id)}>
                      <Flag className="mr-1 h-3.5 w-3.5" /> Report
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {data?.pagination?.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.pagination.pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= data.pagination.pages || loading}
            onClick={() => setPage((current) => Math.min(data.pagination.pages, current + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  )
}
