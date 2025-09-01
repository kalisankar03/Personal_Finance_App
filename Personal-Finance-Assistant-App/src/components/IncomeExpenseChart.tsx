import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

interface ChartData {
  month: string
  income: number
  expense: number
}

interface IncomeExpenseChartProps {
  data: ChartData[]
}

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  // Process data for better display
  const chartData = data.map(item => ({
    ...item,
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { 
      month: 'short',
      year: '2-digit'
    }),
    net: item.income - item.expense
  }))

  // If no data, show placeholder
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p>No data available</p>
              <p className="text-sm">Add some transactions to see your trends</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(2)}`,
                  name === 'income' ? 'Income' : name === 'expense' ? 'Expenses' : 'Net'
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="income" 
                fill="#10b981" 
                name="Income"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="expense" 
                fill="#ef4444" 
                name="Expenses"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-gray-600">Avg Income</p>
            <p className="text-lg font-semibold text-green-600">
              ${chartData.length > 0 ? (chartData.reduce((sum, item) => sum + item.income, 0) / chartData.length).toFixed(2) : '0.00'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Avg Expenses</p>
            <p className="text-lg font-semibold text-red-600">
              ${chartData.length > 0 ? (chartData.reduce((sum, item) => sum + item.expense, 0) / chartData.length).toFixed(2) : '0.00'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Avg Net</p>
            <p className={`text-lg font-semibold ${
              chartData.length > 0 && (chartData.reduce((sum, item) => sum + item.net, 0) / chartData.length) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              ${chartData.length > 0 ? (chartData.reduce((sum, item) => sum + item.net, 0) / chartData.length).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}