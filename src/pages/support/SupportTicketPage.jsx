import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Textarea } from '@/components/ui'
import { EmptyState, LoadingSpinner, PageWrapper } from '@/components/shared'
import { supportAPI } from '@/services/api'
import toast from 'react-hot-toast'

const label = (value) => value?.replaceAll('_', ' ') || ''

export default function SupportTicketPage() {
  const { id } = useParams()
  const [ticketData, setTicketData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [file, setFile] = useState(null)

  const loadTicket = useCallback(async () => {
    try {
      const response = await supportAPI.getTicket(id, { limit: 50 })
      setTicketData(response.data)
    } catch {
      toast.error('Unable to load this support ticket.')
      setTicketData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void Promise.resolve().then(loadTicket)
  }, [loadTicket])

  const submit = async (event) => {
    event.preventDefault()
    if (message.trim().length < 2) return toast.error('Write a message before sending.')
    if (file && (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      return toast.error('Use a JPEG, PNG, or WebP image up to 5 MB.')
    }
    setSending(true)
    const formData = new FormData()
    formData.append('message', message)
    if (file) formData.append('attachment', file)
    try {
      await supportAPI.sendMessage(id, formData)
      setMessage('')
      setFile(null)
      await loadTicket()
      toast.success('Reply sent.')
    } catch (error) {
      toast.error(error?.message || 'Reply was not sent.')
    } finally {
      setSending(false)
    }
  }

  if (loading || ticketData?.ticket?._id !== id) return <LoadingSpinner className="py-20" />
  if (!ticketData?.ticket) return <PageWrapper><EmptyState title="Ticket unavailable" description="This ticket does not exist or is not accessible from your account." /></PageWrapper>

  const { ticket, messages = [] } = ticketData
  return (
    <PageWrapper>
      <Link to="/help" className="mb-4 inline-flex items-center gap-2 text-sm text-orange-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to Help & Support</Link>
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div><p className="text-xs text-muted-foreground">{ticket.ticketNumber}</p><h1 className="mt-1 text-lg font-bold">{ticket.subject}</h1><p className="mt-1 text-xs text-muted-foreground">Created {new Date(ticket.createdAt).toLocaleString()}{ticket.order?.orderNumber ? ` · Order ${ticket.order.orderNumber}` : ''}</p></div>
          <Badge className="capitalize">{label(ticket.status)}</Badge>
        </CardContent>
      </Card>

      <section className="mb-4 space-y-3" aria-label="Ticket conversation">
        {messages.length ? messages.map((item) => (
          <Card key={item._id}><CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2"><Badge variant={item.authorRole === 'admin' ? 'default' : 'secondary'} className="capitalize">{item.authorRole === 'admin' ? 'ShopLink Support' : 'You'}</Badge><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time></div>
            <p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>
            {item.attachment?.url && <a className="mt-3 inline-block text-sm text-orange-600 underline" href={item.attachment.url} target="_blank" rel="noreferrer">View attachment: {item.attachment.originalName}</a>}
          </CardContent></Card>
        )) : <EmptyState title="No messages" description="The ticket conversation is empty." />}
      </section>

      {ticket.status === 'closed' ? (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">This ticket is closed. Submit a new request from Help & Support if you need more assistance.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-4">
          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="ticket-reply" className="text-sm font-medium">Add a reply</label>
            <Textarea id="ticket-reply" rows={4} maxLength={5000} required value={message} onChange={(event) => setMessage(event.target.value)} />
            <Input aria-label="Optional image attachment" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <Button type="submit" disabled={sending}><Send className="h-4 w-4" />{sending ? 'Sending…' : 'Send reply'}</Button>
          </form>
        </CardContent></Card>
      )}
    </PageWrapper>
  )
}
