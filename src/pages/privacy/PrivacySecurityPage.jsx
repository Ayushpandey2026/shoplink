import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, LockKeyhole, LogOut, Shield, ShieldAlert, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { EmptyState, LoadingSpinner, PageWrapper } from '@/components/shared'
import { privacyAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import { disconnectSocket, initSocket } from '@/lib/socket'
import toast from 'react-hot-toast'

const requestStatus = (value) => value.replaceAll('_', ' ')

export default function PrivacySecurityPage() {
  const navigate = useNavigate()
  const { setAuth, logout } = useAuthStore()
  const [privacy, setPrivacy] = useState(null)
  const [security, setSecurity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingPreference, setSavingPreference] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deletionConfirmed, setDeletionConfirmed] = useState(false)
  const [deletionPassword, setDeletionPassword] = useState('')
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })

  const loadData = useCallback(async () => {
    try {
      const [privacyResponse, securityResponse] = await Promise.all([
        privacyAPI.getCenter(),
        privacyAPI.getSecurity(),
      ])
      setPrivacy(privacyResponse.data)
      setSecurity(securityResponse.data)
    } catch (error) {
      toast.error(error?.message || 'Unable to load your privacy and security information.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadData)
  }, [loadData])

  const changePromotions = async (enabled) => {
    setSavingPreference(true)
    try {
      const response = await privacyAPI.updatePreferences({ promotions: enabled })
      setPrivacy((previous) => ({ ...previous, preferences: response.data.preferences }))
      toast.success('Privacy preference saved.')
    } catch {
      toast.error('Unable to update the preference.')
    } finally {
      setSavingPreference(false)
    }
  }

  const downloadExport = async () => {
    setExporting(true)
    try {
      const response = await privacyAPI.requestExport()
      const blob = new Blob([JSON.stringify(response.data.export, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `shoplink-account-export-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      await loadData()
      toast.success('Your account data export is ready.')
    } catch (error) {
      toast.error(error?.message || 'Unable to generate your data export.')
    } finally {
      setExporting(false)
    }
  }

  const submitDeletionRequest = async (event) => {
    event.preventDefault()
    if (!deletionConfirmed) return toast.error('Confirm that this submits a request and does not immediately delete your account.')
    if (privacy?.profile?.authProvider === 'local' && !deletionPassword) return toast.error('Enter your current password to confirm.')
    setDeleting(true)
    try {
      const response = await privacyAPI.requestDeletion({
        ...(deletionPassword && { currentPassword: deletionPassword }),
      })
      toast.success(response.message)
      setDeletionPassword('')
      setDeletionConfirmed(false)
      await loadData()
    } catch (error) {
      toast.error(error?.message || 'Unable to submit your deletion request.')
    } finally {
      setDeleting(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    if (passwords.newPassword.length < 8) return toast.error('New password must be at least 8 characters.')
    setPasswordLoading(true)
    try {
      await privacyAPI.changePassword(passwords)
      toast.success('Password changed. Please sign in again.')
      disconnectSocket()
      logout()
      navigate('/auth/login', { replace: true })
    } catch (error) {
      toast.error(error?.message || 'Unable to change password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const logoutOtherSessions = async () => {
    if (!window.confirm('Sign out all other ShopLink sessions? This device will stay signed in.')) return
    setRevoking(true)
    try {
      const response = await privacyAPI.revokeOtherSessions()
      setAuth(response.data)
      disconnectSocket()
      initSocket(response.data.accessToken)
      await loadData()
      toast.success('Other sessions have been signed out.')
    } catch (error) {
      toast.error(error?.message || 'Unable to sign out other sessions.')
    } finally {
      setRevoking(false)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />
  if (!privacy) return <PageWrapper><EmptyState title="Privacy center unavailable" description="Please try again later." /></PageWrapper>

  const openDeletionRequest = privacy.requests?.some((request) =>
    request.type === 'account_deletion' && ['received', 'in_review', 'approved'].includes(request.status)
  )

  return (
    <PageWrapper>
      <header className="mb-5">
        <div className="flex items-center gap-2"><Shield className="h-6 w-6 text-orange-500" /><h1 className="text-xl font-bold">Privacy & Security</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">Review ShopLink data use, control optional promotions, and secure your account.</p>
      </header>

      <Card className="mb-4">
        <CardHeader><CardTitle>Information ShopLink stores</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {privacy.storedData?.map((item) => <div key={item.key}><h2 className="text-sm font-semibold">{item.label}</h2><p className="text-sm text-muted-foreground">{item.details}</p></div>)}
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{privacy.retention}</p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Privacy preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-orange-500"
              checked={Boolean(privacy.preferences?.promotions)}
              disabled={savingPreference}
              onChange={(event) => changePromotions(event.target.checked)}
            />
            <span><span className="block text-sm font-medium">Optional promotional notifications</span><span className="block text-xs text-muted-foreground">Control promotional messages. Essential account, security, and order notifications remain enabled.</span></span>
          </label>
          {savingPreference && <p role="status" className="text-xs text-muted-foreground">Saving preference…</p>}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" /> Your account data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Generate a JSON copy of the account profile, owned shop, orders, and public support conversation history available to your account.</p>
          <Button onClick={downloadExport} disabled={exporting}>{exporting ? 'Preparing export…' : 'Download my data'}</Button>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Request account deletion</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">This sends a request for review; it does not immediately delete your account. ShopLink may retain transaction, tax, fraud-prevention, or dispute records where required.</p>
          {openDeletionRequest ? <Badge variant="warning">Deletion request under review</Badge> : (
            <form onSubmit={submitDeletionRequest} className="space-y-3">
              {privacy.profile?.authProvider === 'local' && <div className="space-y-1.5"><Label htmlFor="deletion-password">Current password</Label><Input id="deletion-password" type="password" autoComplete="current-password" value={deletionPassword} onChange={(event) => setDeletionPassword(event.target.value)} /></div>}
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-orange-500" checked={deletionConfirmed} onChange={(event) => setDeletionConfirmed(event.target.checked)} /><span>I understand this submits a deletion request for review and does not delete the account now.</span></label>
              <Button type="submit" variant="destructive" disabled={deleting}>{deleting ? 'Submitting…' : 'Submit deletion request'}</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="h-4 w-4" /> Account security</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {security?.passwordChangeAvailable ? (
            <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="current-password">Current password</Label><Input id="current-password" type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} /></div>
              <Button type="submit" disabled={passwordLoading} className="sm:col-span-2 sm:w-fit">{passwordLoading ? 'Updating…' : 'Change password'}</Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">This account uses its linked identity provider. Manage credentials with that provider.</p>
          )}
          {security?.passwordResetAvailable && <p className="text-xs text-muted-foreground">Lost access? <a href="/auth/forgot-password" className="text-orange-600 underline">Request a one-use password reset link</a> (requires backend email configuration).</p>}
          <div className="border-t pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Active login sessions</h2><Button variant="outline" size="sm" disabled={revoking || !security?.sessions?.some((session) => !session.current)} onClick={logoutOtherSessions}><LogOut className="h-4 w-4" />{revoking ? 'Signing out…' : 'Sign out other sessions'}</Button></div>
            {security?.sessions?.length ? <ul className="space-y-2">{security.sessions.map((session) => <li key={session._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div className="min-w-0"><p className="break-all text-sm">{session.device}</p><p className="text-xs text-muted-foreground">Last seen {new Date(session.lastSeenAt).toLocaleString()}</p></div><Badge variant={session.current ? 'success' : 'secondary'}>{session.current ? 'This device' : 'Active'}</Badge></li>)}</ul> : <p className="text-sm text-muted-foreground">No active session records were found.</p>}
            <p className="mt-2 text-xs text-muted-foreground">Session records began when this security feature was deployed; older sessions are not available in the device list. Signing out other sessions invalidates older token versions as well.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/help?category=security_privacy')}><ShieldAlert className="h-4 w-4" /> Report suspicious activity</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Privacy request history</CardTitle></CardHeader>
        <CardContent>
          {privacy.requests?.length ? <div className="space-y-2">{privacy.requests.map((request) => <div key={request._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className="text-sm font-medium capitalize">{request.type.replaceAll('_', ' ')}</p><p className="text-xs text-muted-foreground">Submitted {new Date(request.requestedAt).toLocaleString()}</p></div><Badge variant={request.status === 'completed' ? 'success' : 'secondary'} className="capitalize">{requestStatus(request.status)}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No privacy requests yet.</p>}
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
