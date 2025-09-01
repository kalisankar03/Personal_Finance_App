import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface ExpensePieChartProps {
  data: Record<string, number>
}

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange  
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
]

export function ExpensePieChart({ data }: ExpensePieChartProps) {
  // Convert data to chart format
  const chartData = Object.entries(data).map(([category, amount], index) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: amount,
    color: COLORS[index % COLORS.length],
    percentage: 0 // Will be calculated below
  }))

  // Calculate total and percentages
  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  chartData.forEach(item => {
    item.percentage = total > 0 ? (item.value / total) * 100 : 0
  })

  // Sort by value (descending)
  chartData.sort((a, b) => b.value - a.value)

  // If no data, show placeholder
  if (chartData.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p>No expense data available</p>
              <p className="text-sm">Add some expenses to see the breakdown</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            ${data.value.toFixed(2)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  ${item.value.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Expenses</span>
            <span className="text-lg font-bold text-red-600">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}