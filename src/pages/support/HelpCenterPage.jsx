import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Headphones, Search, Send, Ticket } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Label, Textarea } from '@/components/ui'
import { EmptyState, LoadingSpinner, PageWrapper } from '@/components/shared'
import { supportAPI } from '@/services/api'
import toast from 'react-hot-toast'

const categories = [
  ['order_issue', 'Order issue'],
  ['payment_refund', 'Payment or refund'],
  ['delivery', 'Delivery'],
  ['product_listing', 'Product or listing'],
  ['misconduct', 'Buyer or seller conduct'],
  ['account_login', 'Account or login'],
  ['security_privacy', 'Security or privacy'],
  ['technical', 'Technical issue'],
  ['other', 'Other'],
]

const faqItems = [
  { section: 'Account', question: 'How do I access my account?', answer: 'Sign in using the method used when you registered. Google-only accounts should continue with Google. Your profile and privacy controls are available from the account menu.' },
  { section: 'Buyer orders', question: 'Where can I see my order status?', answer: 'Open Orders from the app navigation or view completed purchases in Buyer analytics. You can raise a support ticket and include an order if you are a participant in it.' },
  { section: 'Buyer orders', question: 'Why can’t I order from a farther shop?', answer: 'ShopLink enforces a 50 km purchase-area check before checkout. A membership delivery waiver does not bypass this restriction.' },
  { section: 'Seller inventory', question: 'How do I list inventory?', answer: 'Sellers can create listings from My Products. Inventory recovery metrics depend on financial values captured when a listing is created; older listings without those snapshots are not estimated.' },
  { section: 'Payments and refunds', question: 'How are payments and refunds handled?', answer: 'ShopLink currently uses its configured Razorpay payment flow. The deployment may be in test mode; check the payment status shown on your order and contact support for a specific dispute.' },
  { section: 'ShopLink Plus', question: 'Does ShopLink Plus renew automatically?', answer: 'No. The current implementation is a one-time, time-limited purchase and does not automatically renew. Purchase and delivery benefits appear only when configured by ShopLink.' },
  { section: 'Privacy and security', question: 'Can I request my account data or deletion?', answer: 'Use Privacy & Security in your profile. Data exports are generated for your account. Deletion requests are reviewed and are not an immediate deletion; transaction records may be retained when required.' },
]

const statusLabel = (status) => status.replaceAll('_', ' ')
const statusVariant = (status) => status === 'resolved' || status === 'closed' ? 'success' : status === 'waiting_for_user' ? 'warning' : 'secondary'

export default function HelpCenterPage() {
  const [searchParams] = useSearchParams()
  const requestedCategory = searchParams.get('category')
  const initialCategory = categories.some(([value]) => value === requestedCategory) ? requestedCategory : 'other'
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({ category: initialCategory, subject: '', description: '', orderId: '', preferredContactMethod: 'in_app' })

  const loadTickets = useCallback(async () => {
    try {
      const response = await supportAPI.listTickets({ limit: 50 })
      setTickets(response.data.tickets || [])
    } catch {
      toast.error('Unable to load your support history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadTickets)
  }, [loadTickets])

  const visibleFaqs = useMemo(() => {
    const term = search.trim().toLowerCase()
    return faqItems.filter((item) => !term || `${item.section} ${item.question} ${item.answer}`.toLowerCase().includes(term))
  }, [search])

  const submitTicket = async (event) => {
    event.preventDefault()
    if (form.subject.trim().length < 4 || form.description.trim().length < 10) {
      toast.error('Add a subject and describe the issue in at least 10 characters.')
      return
    }
    if (file && (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      toast.error('Use a JPEG, PNG, or WebP image up to 5 MB.')
      return
    }
    setSubmitting(true)
    const data = new FormData()
    Object.entries(form).forEach(([key, value]) => value && data.append(key, value))
    if (file) data.append('attachment', file)
    try {
      const response = await supportAPI.createTicket(data)
      toast.success(`Request submitted: ${response.data.ticket.ticketNumber}`)
      if (response.data.notifications?.email === 'not_configured') {
        toast('Email updates are not configured; replies remain available in the app.', { icon: 'ℹ️' })
      }
      setForm({ category: initialCategory, subject: '', description: '', orderId: '', preferredContactMethod: 'in_app' })
      setFile(null)
      await loadTickets()
    } catch (error) {
      toast.error(error?.message || 'Your request was not submitted. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <header className="mb-5">
        <div className="flex items-center gap-2"><Headphones className="h-6 w-6 text-orange-500" /><h1 className="text-xl font-bold">Help & Support</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">Search the help center or submit a support request you can track.</p>
      </header>

      <Card className="mb-5">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-2"><Ticket className="h-5 w-5 text-orange-500" /><h2 className="font-semibold">Raise a complaint</h2></div>
          <form onSubmit={submitTicket} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="support-category">Category</Label>
              <select id="support-category" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}>
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-subject">Subject</Label>
              <Input id="support-subject" maxLength={120} required value={form.subject} onChange={(event) => setForm((previous) => ({ ...previous, subject: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-order">Related order ID (optional)</Label>
              <Input id="support-order" placeholder="MongoDB order ID" value={form.orderId} onChange={(event) => setForm((previous) => ({ ...previous, orderId: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-contact">Preferred reply method</Label>
              <select id="support-contact" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" value={form.preferredContactMethod} onChange={(event) => setForm((previous) => ({ ...previous, preferredContactMethod: event.target.value }))}>
                <option value="in_app">In-app (recommended)</option><option value="email">Email (if configured)</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="support-description">Describe what happened</Label>
              <Textarea id="support-description" maxLength={5000} minLength={10} required rows={5} value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} />
              <p className="text-xs text-muted-foreground">Do not include passwords, one-time codes, payment credentials, or secrets.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="support-attachment">Screenshot (optional)</Label>
              <Input id="support-attachment" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP only; maximum 5 MB. Attachments are stored privately and only shown to you and authorized support staff.</p>
            </div>
            <Button type="submit" disabled={submitting} className="sm:col-span-2 sm:w-fit"><Send className="h-4 w-4" />{submitting ? 'Submitting…' : 'Submit support request'}</Button>
          </form>
        </CardContent>
      </Card>

      <section className="mb-5">
        <h2 className="mb-3 text-lg font-bold">Search help articles</h2>
        <div className="relative mb-3"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search account, orders, seller, payments, privacy…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="grid gap-3 md:grid-cols-2">
          {visibleFaqs.map((faq) => (
            <Card key={faq.question}><CardContent className="p-4"><Badge variant="secondary">{faq.section}</Badge><h3 className="mt-2 text-sm font-semibold">{faq.question}</h3><p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p></CardContent></Card>
          ))}
          {!visibleFaqs.length && <EmptyState title="No matching help articles" description="Try a different search or submit a support request." />}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">My support tickets</h2><span className="text-xs text-muted-foreground">{tickets.length} shown</span></div>
        {loading ? <LoadingSpinner className="py-8" /> : tickets.length ? (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link key={ticket._id} to={`/support/${ticket._id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                <Card className="transition-colors hover:bg-muted/30"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0"><p className="text-sm font-semibold">{ticket.subject}</p><p className="mt-1 text-xs text-muted-foreground">{ticket.ticketNumber} · {new Date(ticket.lastActivityAt).toLocaleString()}</p></div>
                  <Badge variant={statusVariant(ticket.status)} className="capitalize">{statusLabel(ticket.status)}</Badge>
                </CardContent></Card>
              </Link>
            ))}
          </div>
        ) : <EmptyState title="No support tickets yet" description="Your submitted support requests will be listed here." />}
      </section>
    </PageWrapper>
  )
}
