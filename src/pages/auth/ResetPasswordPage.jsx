import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'
import { authAPI } from '@/services/api'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (newPassword.length < 8 || newPassword.length > 128) {
      toast.error('Password must contain 8–128 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const response = await authAPI.completePasswordReset({ token, newPassword })
      setComplete(true)
      toast.success(response.message)
    } catch (error) {
      toast.error(error?.message || 'This password reset link is invalid or expired.')
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
            <h1 className="text-xl font-bold">Choose a new password</h1>
          </div>
          {complete ? (
            <div className="space-y-3">
              <p role="status" className="text-sm">Your password was reset. Sign in with your new password.</p>
              <Link to="/auth/login" className="text-sm font-medium text-orange-600 hover:underline">Go to login</Link>
            </div>
          ) : !/^[a-f\d]{64}$/i.test(token) ? (
            <p role="alert" className="text-sm text-destructive">This reset link is missing or malformed. Request a new link.</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Updating…' : 'Reset password'}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
