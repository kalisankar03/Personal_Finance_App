import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Alert, AlertDescription } from './components/ui/alert'
import { PlusCircle, Receipt, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'
import { TransactionForm } from './components/TransactionForm'
import { ReceiptScanner } from './components/ReceiptScanner'
import { TransactionHistory } from './components/TransactionHistory'
import { IncomeExpenseChart } from './components/IncomeExpenseChart'
import { ExpensePieChart } from './components/ExpensePieChart'
import { projectId, publicAnonKey } from './utils/supabase/info'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  date: string
  createdAt: string
  source: string
  vendor?: string
}

interface Analytics {
  totalIncome: number
  totalExpense: number
  balance: number
  expensesByCategory: Record<string, number>
  monthlyData: Array<{ month: string; income: number; expense: number }>
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    expensesByCategory: {},
    monthlyData: []
  })
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [useLocalStorage, setUseLocalStorage] = useState(true) // Start in local mode by default
  const [connectionError, setConnectionError] = useState('')
  const [showingLocalMode, setShowingLocalMode] = useState(true)

  // Local storage functions as fallback
  const saveTransactionsToLocal = (transactions: Transaction[]) => {
    localStorage.setItem('finbud_transactions', JSON.stringify(transactions))
  }

  const loadTransactionsFromLocal = (): Transaction[] => {
    try {
      const saved = localStorage.getItem('finbud_transactions')
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Error loading from localStorage:', error)
      return []
    }
  }

  const calculateAnalytics = (transactions: Transaction[]): Analytics => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expensesByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {} as Record<string, number>)
    
    const monthlyData = transactions.reduce((acc, t) => {
      const month = t.date.substring(0, 7)
      if (!acc[month]) {
        acc[month] = { month, income: 0, expense: 0 }
      }
      acc[month][t.type] += t.amount
      return acc
    }, {} as Record<string, any>)
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      expensesByCategory,
      monthlyData: Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month))
    }
  }

  const fetchTransactions = async () => {
    if (useLocalStorage) {
      const localTransactions = loadTransactionsFromLocal()
      setTransactions(localTransactions)
      setAnalytics(calculateAnalytics(localTransactions))
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-399e7117/transactions`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`)
    }
    
    const data = await response.json()
    setTransactions(data.transactions || [])
  }

  const fetchAnalytics = async () => {
    if (useLocalStorage) {
      return // Analytics calculated in fetchTransactions for local mode
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-399e7117/analytics`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`)
    }
    
    const data = await response.json()
    setAnalytics(data)
  }

  const loadSampleData = () => {
    const today = new Date()
    const currentMonth = today.toISOString().split('T')[0].substring(0, 7) // YYYY-MM
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0].substring(0, 7)
    
    const sampleTransactions: Transaction[] = [
      {
        id: 'sample_1',
        type: 'income',
        amount: 3500,
        category: 'salary',
        description: 'Monthly Salary',
        date: `${currentMonth}-01`,
        createdAt: `${currentMonth}-01T09:00:00Z`,
        source: 'manual'
      },
      {
        id: 'sample_2',
        type: 'income',
        amount: 3200,
        category: 'salary',
        description: 'Previous Month Salary',
        date: `${lastMonth}-01`,
        createdAt: `${lastMonth}-01T09:00:00Z`,
        source: 'manual'
      },
      {
        id: 'sample_3',
        type: 'expense',
        amount: 85.50,
        category: 'food',
        description: 'Grocery Shopping',
        date: `${currentMonth}-15`,
        createdAt: `${currentMonth}-15T14:30:00Z`,
        source: 'manual'
      },
      {
        id: 'sample_4',
        type: 'expense',
        amount: 45.00,
        category: 'transport',
        description: 'Gas Station',
        date: `${currentMonth}-20`,
        createdAt: `${currentMonth}-20T10:15:00Z`,
        source: 'receipt'
      },
      {
        id: 'sample_5',
        type: 'expense',
        amount: 120.00,
        category: 'utilities',
        description: 'Electricity Bill',
        date: `${currentMonth}-10`,
        createdAt: `${currentMonth}-10T16:00:00Z`,
        source: 'manual'
      },
      {
        id: 'sample_6',
        type: 'expense',
        amount: 75.30,
        category: 'food',
        description: 'Restaurant Dinner',
        date: `${currentMonth}-22`,
        createdAt: `${currentMonth}-22T19:30:00Z`,
        source: 'manual'
      },
      {
        id: 'sample_7',
        type: 'expense',
        amount: 25.99,
        category: 'entertainment',
        description: 'Movie Tickets',
        date: `${currentMonth}-18`,
        createdAt: `${currentMonth}-18T20:00:00Z`,
        source: 'receipt'
      },
      {
        id: 'sample_8',
        type: 'expense',
        amount: 95.00,
        category: 'shopping',
        description: 'Clothing Purchase',
        date: `${lastMonth}-25`,
        createdAt: `${lastMonth}-25T15:20:00Z`,
        source: 'manual'
      },
      {
        id: 'sample_9',
        type: 'expense',
        amount: 55.40,
        category: 'healthcare',
        description: 'Pharmacy',
        date: `${lastMonth}-12`,
        createdAt: `${lastMonth}-12T11:45:00Z`,
        source: 'manual'
      }
    ]
    
    setTransactions(sampleTransactions)
    setAnalytics(calculateAnalytics(sampleTransactions))
    saveTransactionsToLocal(sampleTransactions)
    setShowingLocalMode(true)
  }

  const loadData = async () => {
    setLoading(true)
    
    try {
      if (useLocalStorage) {
        // Start with local storage mode
        const localTransactions = loadTransactionsFromLocal()
        
        if (localTransactions.length > 0) {
          // Use existing local data
          setTransactions(localTransactions)
          setAnalytics(calculateAnalytics(localTransactions))
          setShowingLocalMode(false) // User has real data
        } else {
          // No local data, load sample data
          loadSampleData()
        }
      } else {
        // Server mode - try to fetch from server
        try {
          await Promise.all([fetchTransactions(), fetchAnalytics()])
          setConnectionError('')
          setShowingLocalMode(false)
        } catch (error) {
          // Server failed, fall back to local mode
          console.log('Server connection failed, falling back to local mode')
          setUseLocalStorage(true)
          setConnectionError('Unable to connect to server. Using local storage mode.')
          
          const localTransactions = loadTransactionsFromLocal()
          if (localTransactions.length > 0) {
            setTransactions(localTransactions)
            setAnalytics(calculateAnalytics(localTransactions))
          } else {
            loadSampleData()
          }
        }
      }
    } catch (error) {
      console.error('Error during initialization:', error)
      // Ultimate fallback to sample data
      loadSampleData()
    }
    
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleTransactionAdded = () => {
    setShowTransactionForm(false)
    setShowReceiptScanner(false)
    loadData()
  }

  const addTransactionLocal = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...transaction,
      createdAt: new Date().toISOString()
    }
    
    const updatedTransactions = [...transactions, newTransaction]
    setTransactions(updatedTransactions)
    setAnalytics(calculateAnalytics(updatedTransactions))
    saveTransactionsToLocal(updatedTransactions)
    setShowingLocalMode(false) // User has added real data
    
    return newTransaction
  }

  const deleteTransactionLocal = (transactionId: string) => {
    const updatedTransactions = transactions.filter(t => t.id !== transactionId)
    setTransactions(updatedTransactions)
    setAnalytics(calculateAnalytics(updatedTransactions))
    saveTransactionsToLocal(updatedTransactions)
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (useLocalStorage) {
      deleteTransactionLocal(transactionId)
      return
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-399e7117/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        loadData()
      } else {
        console.error('Failed to delete transaction:', await response.text())
        // Fallback to local storage
        deleteTransactionLocal(transactionId)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      // Fallback to local storage
      deleteTransactionLocal(transactionId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">FinBud</h1>
              <p className="text-gray-600 mt-1">Your personal finance tracker</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowTransactionForm(true)}
                className="flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Add Transaction
              </Button>
              <Button 
                onClick={() => setShowReceiptScanner(true)}
                variant="outline"
                className="flex items-center gap-2"
                disabled={useLocalStorage}
              >
                <Receipt className="w-4 h-4" />
                Scan Receipt
              </Button>
            </div>
          </div>

          {/* Status Alerts */}
          {showingLocalMode && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Welcome to FinBud! You're viewing sample data. Add your own transactions to get started.</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setUseLocalStorage(false)
                    setShowingLocalMode(false)
                    loadData()
                  }}
                >
                  Try Server Mode
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {connectionError && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{connectionError} Your data is being saved locally.</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setUseLocalStorage(false)
                    setConnectionError('')
                    loadData()
                  }}
                >
                  Try Server Mode
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${analytics.balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${analytics.totalIncome.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${analytics.totalExpense.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {transactions.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and History */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IncomeExpenseChart data={analytics.monthlyData} />
              <ExpensePieChart data={analytics.expensesByCategory} />
            </div>
          </TabsContent>
          
          <TabsContent value="transactions">
            <TransactionHistory 
              transactions={transactions} 
              onDeleteTransaction={handleDeleteTransaction}
            />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IncomeExpenseChart data={analytics.monthlyData} />
              <ExpensePieChart data={analytics.expensesByCategory} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {showTransactionForm && (
          <TransactionForm
            onClose={() => setShowTransactionForm(false)}
            onTransactionAdded={handleTransactionAdded}
            useLocalStorage={useLocalStorage}
            onAddTransactionLocal={addTransactionLocal}
          />
        )}

        {showReceiptScanner && !useLocalStorage && (
          <ReceiptScanner
            onClose={() => setShowReceiptScanner(false)}
            onTransactionAdded={handleTransactionAdded}
          />
        )}
      </div>
    </div>
  )
}