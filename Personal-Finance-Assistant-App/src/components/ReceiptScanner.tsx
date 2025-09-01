import React, { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { X, Upload, Camera, Loader } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface ReceiptScannerProps {
  onClose: () => void
  onTransactionAdded: () => void
}

export function ReceiptScanner({ onClose, onTransactionAdded }: ReceiptScannerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [scannedData, setScannedData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreviewImage(result)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data:image/...;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleScanReceipt = async () => {
    if (!previewImage) {
      setError('Please select an image first')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Convert image to base64
      const input = fileInputRef.current
      const file = input?.files?.[0]
      if (!file) {
        throw new Error('No file selected')
      }

      const base64Image = await convertToBase64(file)

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-399e7117/process-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: base64Image
        })
      })

      if (response.ok) {
        const data = await response.json()
        setScannedData(data)
        
        // Auto-close and refresh after successful scan
        setTimeout(() => {
          onTransactionAdded()
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to process receipt')
      }
    } catch (error) {
      console.error('Error processing receipt:', error)
      setError('Failed to process receipt. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Scan Receipt
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scannedData ? (
            <>
              {/* File Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImage ? (
                  <div>
                    <img 
                      src={previewImage} 
                      alt="Receipt preview" 
                      className="max-w-full max-h-48 mx-auto rounded-lg shadow-sm"
                    />
                    <p className="text-sm text-gray-600 mt-2">Click to change image</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Upload Receipt Image
                    </p>
                    <p className="text-sm text-gray-600">
                      Drag and drop or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports JPG, PNG, WebP
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleScanReceipt}
                  disabled={loading || !previewImage}
                  className="flex-1 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Scan Receipt
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Scan Results */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-3">Receipt Processed Successfully!</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">${scannedData.receiptData?.total || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium capitalize">{scannedData.receiptData?.category || 'Other'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium">{scannedData.receiptData?.description || 'Receipt expense'}</span>
                  </div>
                  {scannedData.receiptData?.vendor && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vendor:</span>
                      <span className="font-medium">{scannedData.receiptData.vendor}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 text-center">
                Transaction has been added to your records
              </p>
              
              <Button onClick={onTransactionAdded} className="w-full">
                Close
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}