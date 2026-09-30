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
      } catch {
        setConversations([])
      } finally { setLoading(false) }
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
  const [loadError, setLoadError] = useState(false)
  const bottomRef = useRef(null)
  const typingTimer = useRef(null)

  useEffect(() => {
    let active = true
    const socket = getSocket()
    const appendMessage = (message) => {
      setMessages((prev) => prev.some((item) => item._id === message._id) ? prev : [...prev, message])
    }
    const joinConversation = () => socket?.emit('chat:join', { conversationId: id })
    const handleNewMessage = ({ message, conversationId }) => {
      if (conversationId === id || message?.conversation === id || message?.conversation?._id === id) {
        appendMessage(message)
      }
    }
    const handleTypingUpdate = ({ userId, isTyping: typing, conversationId }) => {
      if (conversationId === id && userId !== user?._id) setIsTyping(typing)
    }

    const loadMessages = async () => {
      try {
        const res = await chatAPI.getMessages(id)
        if (!active) return
        setMessages((current) => {
          const merged = new Map([...(res.data?.messages || []), ...current].map((message) => [message._id, message]))
          return [...merged.values()].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
        })
        const other = res.data?.conversation?.participants?.find((p) => p._id !== user?._id)
        setOtherUser(other)
        setLoadError(false)
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setLoading(false)
      }
      if (active) setTimeout(scrollToBottom, 100)
    }

    loadMessages()
    if (socket) {
      socket.on('connect', joinConversation)
      socket.on('chat:new-message', handleNewMessage)
      socket.on('chat:typing', handleTypingUpdate)
      if (socket.connected) joinConversation()
    }
    return () => {
      active = false
      clearTimeout(typingTimer.current)
      if (socket) {
        socket.off('connect', joinConversation)
        socket.off('chat:new-message', handleNewMessage)
        socket.off('chat:typing', handleTypingUpdate)
        socket.emit('chat:read', { conversationId: id })
        socket.emit('chat:leave', { conversationId: id })
      }
    }
  }, [id, user?._id])

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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

    const socket = getSocket()
    if (socket?.connected) {
      socket.emit('chat:message', { conversationId: id, content }, (result) => {
        if (result?.message) {
          setMessages((prev) => prev.some((item) => item._id === result.message._id) ? prev : [...prev, result.message])
        } else if (result?.error) {
          setText(content)
        }
      })
      setSending(false)
    } else {
      try {
        const response = await chatAPI.sendMessage(id, { content })
        const message = response.data?.message
        if (message) setMessages((prev) => prev.some((item) => item._id === message._id) ? prev : [...prev, message])
      } catch {
        setText(content)
      } finally { setSending(false) }
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />
  if (loadError) return <div className="mx-auto max-w-3xl px-4 py-8 text-center text-sm text-muted-foreground">Unable to load this conversation. Check your connection and try again.</div>

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] min-h-[24rem] max-w-5xl flex-col border-x bg-background">
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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-2">
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
      <div className="shrink-0 border-t px-4 py-3 flex gap-2 bg-background">
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
