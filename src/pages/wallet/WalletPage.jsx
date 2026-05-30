// src/pages/wallet/WalletPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, IndianRupee, Landmark, AlertCircle } from 'lucide-react'
import {
  Button, Card, CardContent, CardHeader, CardTitle, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Label, Separator
} from '@/components/ui'
import { PageWrapper, LoadingSpinner, EmptyState } from '@/components/shared'
import { walletAPI } from '@/services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const txnIcon = { credit: ArrowDownLeft, debit: ArrowUpRight, hold: Clock, release: ArrowDownLeft, withdrawal: ArrowUpRight, refund: ArrowDownLeft }
const txnColor = { credit: 'text-green-600', debit: 'text-red-500', hold: 'text-orange-500', release: 'text-green-600', withdrawal: 'text-red-500', refund: 'text-blue-500' }

export default function WalletPage() {
  const { t } = useTranslation()
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [walletRes, txnRes] = await Promise.all([walletAPI.getWallet(), walletAPI.getTransactions({ limit: 50 })])
      setWallet(walletRes.data.wallet)
      setTransactions(txnRes.data.transactions || [])
    } catch {} finally { setLoading(false) }
  }

  const handleWithdraw = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 100) return toast.error('Minimum withdrawal is ₹100')
    if (amt > wallet?.balance) return toast.error('Insufficient balance')
    setWithdrawing(true)
    try {
      await walletAPI.requestWithdrawal({ amount: amt })
      toast.success(`Withdrawal of ₹${amt} initiated`)
      setShowWithdraw(false)
      setAmount('')
      fetchData()
    } catch { toast.error('Withdrawal failed') } finally { setWithdrawing(false) }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <PageWrapper>
      <h1 className="text-lg font-bold mb-4">💰 {t('wallet.withdraw')}</h1>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card className="bg-gradient-to-br from-orange-500 to-amber-400 border-0 text-white">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs opacity-80 mb-1">{t('wallet.balance')}</p>
            <p className="text-2xl font-bold">₹{wallet?.balance?.toLocaleString('en-IN') || 0}</p>
            <p className="text-xs opacity-70 mt-0.5">Available to withdraw</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">{t('wallet.held')}</p>
            <p className="text-2xl font-bold">₹{wallet?.heldBalance?.toLocaleString('en-IN') || 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">In escrow</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Total Earned', value: wallet?.totalEarned || 0 },
          { label: 'Withdrawn', value: wallet?.totalWithdrawn || 0 },
          { label: 'Refunded', value: wallet?.totalRefunded || 0 },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-bold text-sm mt-0.5">₹{value?.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Withdraw Button */}
      <Button className="w-full mb-5 gap-2" onClick={() => setShowWithdraw(true)} disabled={!wallet?.balance || wallet.balance < 100}>
        <Landmark className="h-4 w-4" />
        Withdraw to Bank
      </Button>

      {/* Transactions */}
      <h2 className="font-semibold text-base mb-3">{t('wallet.transactions')}</h2>

      {transactions.length === 0 ? (
        <EmptyState icon={Wallet} title="No transactions yet" description="Your transaction history will appear here" />
      ) : (
        <div className="space-y-2">
          {transactions.map(txn => {
            const Icon = txnIcon[txn.type] || IndianRupee
            const color = txnColor[txn.type] || 'text-foreground'
            const isCredit = ['credit', 'release', 'refund'].includes(txn.type)
            return (
              <Card key={txn._id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCredit ? 'bg-green-100 dark:bg-green-950/30' : 'bg-red-100 dark:bg-red-950/30'
                  }`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{txn.description}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(txn.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-sm ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                      {isCredit ? '+' : '-'}₹{txn.amount}
                    </p>
                    <Badge variant={txn.status === 'completed' ? 'success' : txn.status === 'pending' ? 'warning' : 'destructive'} className="text-[10px]">
                      {txn.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Withdraw to Bank</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Available Balance</span>
              <span className="font-bold">₹{wallet?.balance?.toLocaleString('en-IN')}</span>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount (min ₹100)"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={100}
                max={wallet?.balance}
              />
            </div>
            <div className="flex gap-2">
              {[500, 1000, 2000, 5000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setAmount(Math.min(amt, wallet?.balance || 0).toString())}
                  className="flex-1 py-1.5 text-xs border rounded-lg hover:border-orange-400 transition-colors"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Withdrawals are processed in 1-2 business days. Make sure your bank details are updated in shop settings.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdraw(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleWithdraw} disabled={withdrawing} className="flex-1">
              {withdrawing ? 'Processing...' : `Withdraw ₹${amount || '0'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
