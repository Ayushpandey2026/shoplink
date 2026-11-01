import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Shield, Ticket } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Textarea } from '@/components/ui'
import { EmptyState, LoadingSpinner, PageWrapper } from '@/components/shared'
import { adminAPI } from '@/services/api'
import AdminShell from './AdminShell'
import toast from 'react-hot-toast'

const ticketStatuses = ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed']
const categories = ['order_issue', 'payment_refund', 'delivery', 'product_listing', 'misconduct', 'account_login', 'security_privacy', 'technical', 'other']
const priorities = ['low', 'medium', 'high', 'urgent']
const pretty = (value) => value?.replaceAll('_', ' ') || ''
const ticketBadge = (status) => status === 'resolved' || status === 'closed' ? 'success' : status === 'waiting_for_user' ? 'warning' : 'secondary'

export default function AdminSupportPage() {
  const [tab, setTab] = useState('tickets')
  const [filters, setFilters] = useState({ search: '', status: '', category: '', priority: '', from: '', to: '' })
  const [tickets, setTickets] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [selectedId, setSelectedId] = useState('')
  const [ticketData, setTicketData] = useState(null)
  const [ticketLoading, setTicketLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [visibility, setVisibility] = useState('public')
  const [reply, setReply] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [saving, setSaving] = useState(false)
  const [privacyStatus, setPrivacyStatus] = useState('')
  const [privacyRequests, setPrivacyRequests] = useState([])
  const [privacyLoading, setPrivacyLoading] = useState(false)

  const loadTickets = useCallback(async (page = 1) => {
    try {
      const response = await adminAPI.getSupportTickets({
        page,
        limit: 15,
        ...(filters.search.trim() && { search: filters.search.trim() }),
        ...(filters.status && { status: filters.status }),
        ...(filters.category && { category: filters.category }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      })
      setTickets(response.data.tickets || [])
      setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 })
      if (selectedId && !response.data.tickets?.some((ticket) => ticket._id === selectedId)) {
        setSelectedId('')
        setTicketData(null)
      }
    } catch (error) {
      toast.error(error?.message || 'Unable to load support tickets.')
    } finally {
      setLoading(false)
    }
  }, [filters, selectedId])

  const loadPrivacyRequests = useCallback(async () => {
    try {
      const response = await adminAPI.getPrivacyRequests({
        limit: 50,
        ...(privacyStatus && { status: privacyStatus }),
      })
      setPrivacyRequests(response.data.requests || [])
    } catch (error) {
      toast.error(error?.message || 'Unable to load privacy requests.')
    } finally {
      setPrivacyLoading(false)
    }
  }, [privacyStatus])

  useEffect(() => {
    void Promise.resolve().then(() => (
      tab === 'tickets' ? loadTickets(1) : loadPrivacyRequests()
    ))
  }, [tab, loadTickets, loadPrivacyRequests])

  const openTicket = async (id) => {
    setSelectedId(id)
    setTicketLoading(true)
    try {
      const response = await adminAPI.getSupportTicket(id, { limit: 50 })
      setTicketData(response.data.ticket)
      setMessages(response.data.messages || [])
    } catch (error) {
      toast.error(error?.message || 'Unable to open ticket.')
      setTicketData(null)
    } finally {
      setTicketLoading(false)
    }
  }

  const sendReply = async (event) => {
    event.preventDefault()
    if (reply.trim().length < 2) return toast.error('Write a message before saving.')
    if (attachment && (attachment.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(attachment.type))) {
      return toast.error('Use a JPEG, PNG, or WebP image up to 5 MB.')
    }
    setSaving(true)
    const formData = new FormData()
    formData.append('message', reply)
    formData.append('visibility', visibility)
    if (attachment) formData.append('attachment', attachment)
    try {
      const response = await adminAPI.replySupportTicket(selectedId, formData)
      setMessages((current) => [...current, response.data.message])
      setReply('')
      setAttachment(null)
      if (visibility === 'public' && response.data.notifications?.email === 'not_configured') {
        toast('Reply saved and in-app notification sent. Email is not configured.', { icon: 'ℹ️' })
      } else {
        toast.success(visibility === 'internal' ? 'Internal note saved.' : 'Reply sent.')
      }
      await loadTickets(pagination.page)
    } catch (error) {
      toast.error(error?.message || 'Message was not saved.')
    } finally {
      setSaving(false)
    }
  }

  const saveTicketUpdate = async () => {
    setSaving(true)
    try {
      const response = await adminAPI.updateSupportTicket(selectedId, {
        status: ticketData.status,
        priority: ticketData.priority,
      })
      setTicketData(response.data.ticket)
      if (response.data.notifications?.email === 'not_configured') {
        toast('Ticket updated and in-app notification sent. Email is not configured.', { icon: 'ℹ️' })
      } else toast.success('Ticket updated.')
      await loadTickets(pagination.page)
    } catch (error) {
      toast.error(error?.message || 'Ticket update failed.')
      await openTicket(selectedId)
    } finally {
      setSaving(false)
    }
  }

  const updatePrivacyRequest = async (request, status) => {
    const resolutionNote = window.prompt('Optional note visible to privacy administrators:', '') || ''
    try {
      const response = await adminAPI.updatePrivacyRequest(request._id, { status, resolutionNote })
      toast.success(response.message)
      await loadPrivacyRequests()
    } catch (error) {
      toast.error(error?.message || 'Unable to update privacy request.')
    }
  }

  const renderTicketDetails = () => {
    if (!selectedId) return <EmptyState title="Select a ticket" description="Ticket conversations and administrative actions appear here." />
    if (ticketLoading) return <LoadingSpinner className="py-10" />
    if (!ticketData) return <EmptyState title="Ticket unavailable" description="Refresh the queue and select a ticket again." />
    return (
      <div className="space-y-4">
        <Card><CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs text-muted-foreground">{ticketData.ticketNumber}</p><h2 className="font-bold">{ticketData.subject}</h2><p className="text-xs text-muted-foreground">{ticketData.user?.name} · {ticketData.user?.email || ticketData.user?.phone} · {ticketData.user?.role}</p>{ticketData.order?.orderNumber && <p className="text-xs text-muted-foreground">Order {ticketData.order.orderNumber}</p>}</div><Badge variant={ticketBadge(ticketData.status)} className="capitalize">{pretty(ticketData.status)}</Badge></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-muted-foreground">Status<select className="h-9 rounded-lg border bg-background px-2 text-sm capitalize text-foreground" value={ticketData.status} onChange={(event) => setTicketData((current) => ({ ...current, status: event.target.value }))}>{ticketStatuses.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}</select></label>
            <label className="grid gap-1 text-xs text-muted-foreground">Priority<select className="h-9 rounded-lg border bg-background px-2 text-sm capitalize text-foreground" value={ticketData.priority} onChange={(event) => setTicketData((current) => ({ ...current, priority: event.target.value }))}>{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          </div>
          <Button size="sm" onClick={saveTicketUpdate} disabled={saving}>Save status / priority</Button>
        </CardContent></Card>

        <div className="space-y-2" aria-label="Ticket message history">
          {messages.map((message) => (
            <Card key={message._id} className={message.visibility === 'internal' ? 'border-amber-400' : ''}><CardContent className="p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge variant={message.visibility === 'internal' ? 'warning' : message.authorRole === 'admin' ? 'default' : 'secondary'}>{message.visibility === 'internal' ? 'Internal note' : message.authorRole === 'admin' ? 'Support' : 'User'}</Badge><span className="text-xs text-muted-foreground">{message.authorRole === 'admin' ? 'Support team' : ticketData.user?.name}</span></div><time className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString()}</time></div>
              <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
              {message.attachment?.url && <a className="mt-2 inline-block text-sm text-orange-600 underline" href={message.attachment.url} target="_blank" rel="noreferrer">View {message.attachment.originalName}</a>}
            </CardContent></Card>
          ))}
        </div>
        {ticketData.status !== 'closed' && (
          <Card><CardContent className="p-4"><form onSubmit={sendReply} className="space-y-3">
            <label className="grid gap-1 text-sm font-medium">Message type<select className="h-10 rounded-lg border bg-background px-3 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="public">Reply visible to user</option><option value="internal">Internal note (private)</option></select></label>
            <Textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} maxLength={5000} required placeholder={visibility === 'internal' ? 'Add a private note for support staff…' : 'Write a reply to the user…'} />
            <Input aria-label="Optional image attachment" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAttachment(event.target.files?.[0] || null)} />
            <Button type="submit" disabled={saving}><MessageSquare className="h-4 w-4" />{saving ? 'Saving…' : visibility === 'internal' ? 'Add internal note' : 'Send reply'}</Button>
          </form></CardContent></Card>
        )}
      </div>
    )
  }

  return (
    <AdminShell>
    <PageWrapper>
      <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-orange-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Admin dashboard</Link>
      <header className="mb-5"><div className="flex items-center gap-2"><Ticket className="h-6 w-6 text-orange-500" /><h1 className="text-xl font-bold">Support & Privacy Management</h1></div><p className="mt-1 text-sm text-muted-foreground">Admin-only inbox. Internal notes are never returned by user-facing ticket endpoints.</p></header>
      <div className="mb-4 flex gap-2"><Button variant={tab === 'tickets' ? 'default' : 'outline'} onClick={() => { setLoading(true); setTab('tickets') }}>Support tickets</Button><Button variant={tab === 'privacy' ? 'default' : 'outline'} onClick={() => { setPrivacyLoading(true); setTab('privacy') }}><Shield className="h-4 w-4" /> Privacy requests</Button></div>

      {tab === 'tickets' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
          <section>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <Input aria-label="Search tickets" placeholder="Search ID, user, subject, order…" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
              <select aria-label="Filter by status" className="h-10 rounded-lg border bg-background px-2 text-sm" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{ticketStatuses.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}</select>
              <select aria-label="Filter by category" className="h-10 rounded-lg border bg-background px-2 text-sm" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{pretty(category)}</option>)}</select>
              <select aria-label="Filter by priority" className="h-10 rounded-lg border bg-background px-2 text-sm" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}><option value="">All priorities</option>{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select>
              <Input aria-label="From date" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
              <Input aria-label="Through date" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
            </div>
            {loading ? <LoadingSpinner className="py-10" /> : tickets.length ? <div className="space-y-2">
              {tickets.map((ticket) => <button key={ticket._id} type="button" onClick={() => openTicket(ticket._id)} className={`w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${selectedId === ticket._id ? 'ring-2 ring-orange-500' : ''}`}>
                <Card><CardContent className="space-y-1 p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{ticket.subject}</p><Badge variant={ticketBadge(ticket.status)} className="shrink-0 capitalize">{pretty(ticket.status)}</Badge></div><p className="text-xs text-muted-foreground">{ticket.ticketNumber} · {ticket.user?.name || 'User'} · {ticket.priority} · {pretty(ticket.category)}</p></CardContent></Card>
              </button>)}
              <div className="flex items-center justify-between pt-2 text-xs"><span>{pagination.total} tickets</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => loadTickets(pagination.page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => loadTickets(pagination.page + 1)}>Next</Button></div></div>
            </div> : <EmptyState title="No support tickets" description="New user complaints will appear here." />}
          </section>
          <section>{renderTicketDetails()}</section>
        </div>
      ) : (
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2"><label className="text-sm">Status<select className="ml-2 h-9 rounded-lg border bg-background px-2" value={privacyStatus} onChange={(event) => setPrivacyStatus(event.target.value)}><option value="">All</option>{['received', 'in_review', 'approved', 'completed', 'rejected'].map((status) => <option key={status} value={status}>{pretty(status)}</option>)}</select></label></div>
          {privacyLoading ? <LoadingSpinner className="py-10" /> : privacyRequests.length ? <div className="space-y-3">
            {privacyRequests.map((request) => <Card key={request._id}><CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="min-w-[220px] flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold capitalize">{pretty(request.type)}</h2><Badge variant={request.status === 'completed' ? 'success' : 'secondary'} className="capitalize">{pretty(request.status)}</Badge></div><p className="mt-1 text-sm">{request.user?.name} · {request.user?.email || request.user?.phone} · {request.user?.role}</p><p className="text-xs text-muted-foreground">Requested {new Date(request.requestedAt).toLocaleString()}</p>{request.resolutionNote && <p className="mt-2 rounded bg-muted p-2 text-xs">{request.resolutionNote}</p>}{request.type === 'account_deletion' && <p className="mt-2 text-xs text-amber-700">Approval does not delete the account. Complete any eligible erasure only through the approved retention and legal review process.</p>}</div>
              {request.status !== 'completed' && request.status !== 'rejected' && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => updatePrivacyRequest(request, 'in_review')}>In review</Button>{request.type === 'account_deletion' && <Button size="sm" onClick={() => updatePrivacyRequest(request, 'approved')}>Approve for review</Button>}<Button size="sm" variant="destructive" onClick={() => updatePrivacyRequest(request, 'rejected')}>Reject</Button></div>}
            </CardContent></Card>)}
          </div> : <EmptyState title="No privacy requests" description="Data export and deletion requests will appear here." />}
        </section>
      )}
    </PageWrapper>
    </AdminShell>
  )
}
