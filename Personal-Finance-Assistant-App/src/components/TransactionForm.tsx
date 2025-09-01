import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { X } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'

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

interface TransactionFormProps {
  onClose: () => void
  onTransactionAdded: () => void
  useLocalStorage?: boolean
  onAddTransactionLocal?: (transaction: Omit<Transaction, 'id'>) => Transaction
}

const expenseCategories = [
  'food',
  'transport',
  'shopping',
  'utilities',
  'healthcare',
  'entertainment',
  'education',
  'other'
]

const incomeCategories = [
  'salary',
  'freelance',
  'business',
  'investment',
  'gift',
  'other'
]

export function TransactionForm({ onClose, onTransactionAdded, useLocalStorage, onAddTransactionLocal }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (useLocalStorage && onAddTransactionLocal) {
        // Use local storage mode
        const transactionData = {
          type: formData.type,
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          date: formData.date,
          source: 'manual'
        }
        onAddTransactionLocal(transactionData)
        onTransactionAdded()
        return
      }

      // Try server mode
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-399e7117/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onTransactionAdded()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add transaction')
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      
      // Fallback to local storage if available
      if (onAddTransactionLocal) {
        try {
          const transactionData = {
            type: formData.type,
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            date: formData.date,
            source: 'manual'
          }
          onAddTransactionLocal(transactionData)
          onTransactionAdded()
          return
        } catch (localError) {
          console.error('Local storage error:', localError)
        }
      }
      
      setError('Unable to save transaction. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear category when type changes
    if (field === 'type') {
      setFormData(prev => ({
        ...prev,
        category: ''
      }))
    }
  }

  const categories = formData.type === 'expense' ? expenseCategories : incomeCategories

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Add Transaction</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.amount || !formData.category}
                className="flex-1"
              >
                {loading ? 'Adding...' : 'Add Transaction'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}