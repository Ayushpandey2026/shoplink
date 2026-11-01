import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'
import { authAPI } from '@/services/api'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const response = await authAPI.requestPasswordReset({ email: email.trim() })
      setSubmitted(true)
      toast.success(response.message)
    } catch (error) {
      toast.error(error?.message || 'Password recovery is currently unavailable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-8">
      <Card className="w-full">
        <CardContent className="space-y-5 p-6">
          <Link to="/auth/login" className="inline-flex items-center gap-2 text-sm text-orange-600 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
          <div>
            <KeyRound className="mb-3 h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We’ll send a one-use reset link to the email address on your password account.
            </p>
          </div>
          {submitted ? (
            <p role="status" className="rounded-lg border p-4 text-sm">
              If this verified email belongs to a password account, reset instructions have been sent. Check your inbox.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <Label htmlFor="reset-email">Account email</Label>
              <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
          <p className="text-xs text-muted-foreground">
            Recovery email must be configured by ShopLink. Google-only accounts should continue using Google sign-in.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
