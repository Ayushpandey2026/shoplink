// src/pages/chat/ChatPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Send, ArrowLeft, MessageSquare } from 'lucide-react'
import { Button, Input, Avatar, AvatarImage, AvatarFallback, Card, CardContent } from '@/components/ui'
import { EmptyState, PageWrapper, LoadingSpinner } from '@/components/shared'
import { chatAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import { getSocket } from '@/lib/socket'
import { format } from 'date-fns'

// ── Conversation List Page ────────────────────────────────────────
export function ConversationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await chatAPI.getConversations()
        setConversations(res.data?.conversations || [])
      } catch {} finally { setLoading(false) }
    }
    fetch()
  }, [])

  const getOtherParticipant = (conv) =>
    conv.participants?.find((p) => p._id !== user?._id)

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <PageWrapper>
      <h1 className="text-lg font-bold mb-4">{t('chat.messages')}</h1>
      {conversations.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('chat.no_conversations')} description="Start a conversation from any product page" />
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const other = getOtherParticipant(conv)
            return (
              <Card key={conv._id} className="cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
                onClick={() => navigate(`/chat/${conv._id}`)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={other?.avatar?.url} />
                    <AvatarFallback>{other?.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <p className="font-medium text-sm truncate">{other?.name}</p>
                      {conv.lastMessage?.sentAt && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {format(new Date(conv.lastMessage.sentAt), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage?.content && (
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.content}</p>
                    )}
                    {conv.product && (
                      <p className="text-xs text-orange-500 truncate">📦 {conv.product.name}</p>
                    )}
                  </div>
                  {conv.myUnreadCount > 0 && (
                    <span className="h-5 w-5 bg-orange-500 rounded-full text-white text-[10px] flex items-center justify-center flex-shrink-0">
                      {conv.myUnreadCount}
                    </span>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </PageWrapper>
  )
}

// ── Single Conversation Page ──────────────────────────────────────
export function ConversationPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [otherUser, setOtherUser] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)
  const typingTimer = useRef(null)

  useEffect(() => {
    fetchMessages()
    const socket = getSocket()
    if (socket) {
      socket.emit('chat:join', { conversationId: id })
      socket.on('chat:new-message', ({ message }) => {
        setMessages((prev) => [...prev, message])
        scrollToBottom()
      })
      socket.on('chat:typing', ({ userId, isTyping: typing }) => {
        if (userId !== user?._id) setIsTyping(typing)
      })
    }
    return () => {
      if (socket) {
        socket.off('chat:new-message')
        socket.off('chat:typing')
        socket.emit('chat:read', { conversationId: id })
      }
    }
  }, [id])

  const fetchMessages = async () => {
    try {
      const res = await chatAPI.getMessages(id)
      setMessages(res.data?.messages || [])
      const other = res.data?.conversation?.participants?.find((p) => p._id !== user?._id)
      setOtherUser(other)
    } catch {} finally { setLoading(false) }
    setTimeout(scrollToBottom, 100)
  }

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => { scrollToBottom() }, [messages])

  const handleTyping = () => {
    const socket = getSocket()
    if (socket) {
      socket.emit('chat:typing', { conversationId: id, isTyping: true })
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => {
        socket.emit('chat:typing', { conversationId: id, isTyping: false })
      }, 1500)
    }
  }

  const sendMessage = async () => {
    if (!text.trim() || sending) return
    const content = text.trim()
    setText('')
    setSending(true)

    // Optimistic update
    const tempMsg = { _id: Date.now(), content, sender: { _id: user?._id }, createdAt: new Date() }
    setMessages((prev) => [...prev, tempMsg])

    const socket = getSocket()
    if (socket) {
      socket.emit('chat:message', { conversationId: id, content })
      setSending(false)
    } else {
      try {
        await chatAPI.sendMessage(id, { content })
        fetchMessages()
      } catch {} finally { setSending(false) }
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur">
        <button onClick={() => navigate('/chat')}><ArrowLeft className="h-5 w-5" /></button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={otherUser?.avatar?.url} />
          <AvatarFallback className="text-xs">{otherUser?.name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">{otherUser?.name}</p>
          {isTyping && <p className="text-xs text-orange-500">{t('chat.typing')}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((msg) => {
          const isMe = msg.sender?._id === user?._id || msg.sender === user?._id
          return (
            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                isMe
                  ? 'bg-orange-500 text-white rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-tl-sm'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-0.5 ${isMe ? 'text-orange-100' : 'text-muted-foreground'}`}>
                  {format(new Date(msg.createdAt), 'HH:mm')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 pb-safe flex gap-2 bg-background">
        <Input
          value={text}
          onChange={(e) => { setText(e.target.value); handleTyping() }}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={t('chat.type_message')}
          className="flex-1"
        />
        <Button size="icon" onClick={sendMessage} disabled={!text.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
