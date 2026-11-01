import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'
import { authAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { setAuth, isAuthenticated, user, logout } = useAuthStore()
  const [email, setEmail] = useState('admin@shoplink.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') navigate('/admin', { replace: true })
  }, [isAuthenticated, user?.role, navigate])

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await authAPI.adminLogin({ email, password })
      setAuth(response.data)
      navigate('/admin', { replace: true })
    } catch (loginError) {
      setError(loginError?.response?.data?.message || loginError?.message || 'Administrator sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  const signOutCurrentAccount = async () => {
    try {
      await authAPI.logout()
    } catch (logoutError) {
      toast.error(logoutError?.message || 'The server session could not be revoked.')
    } finally {
      logout()
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <Card className="w-full max-w-md border-slate-200 shadow-xl dark:border-slate-800">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-orange-600 text-white"><ShieldCheck className="h-7 w-7" /></div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">Restricted access</p>
            <h1 className="mt-2 text-2xl font-bold">Administrator sign in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Use the initialized ShopLink administrator credentials.</p>
          </div>

          {isAuthenticated && user?.role !== 'admin' ? (
            <div className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <p>Sign out of the current marketplace account before using administrator sign-in.</p>
              <Button className="w-full" variant="outline" onClick={signOutCurrentAccount}>Sign out current account</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Administrator email</Label>
                <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password">Password</Label>
                <Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <LockKeyhole className="h-4 w-4" />{loading ? 'Signing in…' : 'Sign in securely'}
              </Button>
            </form>
          )}
          <div className="border-t pt-4 text-center text-sm text-muted-foreground">
            <Link to="/" className="font-medium text-orange-700 hover:underline dark:text-orange-300">Return to ShopLink</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
