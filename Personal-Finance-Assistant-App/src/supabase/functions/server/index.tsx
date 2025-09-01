import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:3000', 'https://*.supabase.co'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Get all transactions
app.get('/make-server-399e7117/transactions', async (c) => {
  try {
    const transactions = await kv.getByPrefix('transaction:')
    const formattedTransactions = transactions.map(item => ({
      id: item.key.replace('transaction:', ''),
      ...item.value
    }))
    
    return c.json({ transactions: formattedTransactions })
  } catch (error) {
    console.log('Error fetching transactions:', error)
    return c.json({ error: 'Failed to fetch transactions' }, 500)
  }
})

// Add manual transaction
app.post('/make-server-399e7117/transactions', async (c) => {
  try {
    const body = await c.req.json()
    const { type, amount, category, description, date } = body
    
    if (!type || !amount || !category) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    const transactionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const transaction = {
      type, // 'income' or 'expense'
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      source: 'manual'
    }
    
    await kv.set(`transaction:${transactionId}`, transaction)
    
    return c.json({ 
      success: true, 
      transaction: { id: transactionId, ...transaction }
    })
  } catch (error) {
    console.log('Error adding transaction:', error)
    return c.json({ error: 'Failed to add transaction' }, 500)
  }
})

// Process receipt with Gemini API
app.post('/make-server-399e7117/process-receipt', async (c) => {
  try {
    const body = await c.req.json()
    const { imageBase64 } = body
    
    if (!imageBase64) {
      return c.json({ error: 'No image provided' }, 400)
    }
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return c.json({ error: 'Gemini API key not configured' }, 500)
    }
    
    // Call Gemini API to analyze receipt
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this receipt image and extract the following information in JSON format:
            {
              "total": "total amount as number",
              "category": "expense category (food, transport, shopping, utilities, healthcare, entertainment, other)",
              "description": "brief description of the purchase",
              "vendor": "store/vendor name if visible"
            }
            Only return valid JSON, no additional text.`
          }, {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64
            }
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 256,
        },
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }
    
    const result = await response.json()
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!generatedText) {
      throw new Error('No response from Gemini API')
    }
    
    // Parse the JSON response
    let receiptData
    try {
      receiptData = JSON.parse(generatedText.trim())
    } catch (parseError) {
      console.log('Failed to parse Gemini response as JSON:', generatedText)
      throw new Error('Invalid response format from Gemini API')
    }
    
    // Create transaction from receipt data
    const transactionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const transaction = {
      type: 'expense',
      amount: parseFloat(receiptData.total) || 0,
      category: receiptData.category || 'other',
      description: receiptData.description || receiptData.vendor || 'Receipt expense',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      source: 'receipt',
      vendor: receiptData.vendor || ''
    }
    
    await kv.set(`transaction:${transactionId}`, transaction)
    
    return c.json({ 
      success: true,
      receiptData,
      transaction: { id: transactionId, ...transaction }
    })
    
  } catch (error) {
    console.log('Error processing receipt:', error)
    return c.json({ error: `Failed to process receipt: ${error.message}` }, 500)
  }
})

// Delete transaction
app.delete('/make-server-399e7117/transactions/:id', async (c) => {
  try {
    const transactionId = c.req.param('id')
    await kv.del(`transaction:${transactionId}`)
    
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting transaction:', error)
    return c.json({ error: 'Failed to delete transaction' }, 500)
  }
})

// Get analytics data
app.get('/make-server-399e7117/analytics', async (c) => {
  try {
    const transactions = await kv.getByPrefix('transaction:')
    const transactionData = transactions.map(item => item.value)
    
    // Calculate totals
    const totalIncome = transactionData
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpense = transactionData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    // Category breakdown for expenses
    const expensesByCategory = transactionData
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {})
    
    // Monthly data for charts
    const monthlyData = transactionData.reduce((acc, t) => {
      const month = t.date.substring(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = { month, income: 0, expense: 0 }
      }
      acc[month][t.type] += t.amount
      return acc
    }, {})
    
    return c.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      expensesByCategory,
      monthlyData: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
    })
  } catch (error) {
    console.log('Error fetching analytics:', error)
    return c.json({ error: 'Failed to fetch analytics' }, 500)
  }
})

Deno.serve(app.fetch)