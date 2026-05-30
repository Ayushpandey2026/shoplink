// src/components/barcode/BarcodeScanner.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, X, Zap, AlertCircle } from 'lucide-react'
import { Button, Alert, AlertDescription } from '@/components/ui'
import { cn } from '@/lib/utils'

export const BarcodeScanner = ({ onScan, onClose, className }) => {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)

  const startScanner = useCallback(async () => {
    try {
      setError(null)
      setScanning(true)

      const codeReader = new BrowserMultiFormatReader()
      readerRef.current = codeReader

      // Get available cameras and prefer back camera
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      const backCamera = devices.find((d) =>
        d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
      ) || devices[0]

      if (!backCamera) throw new Error('No camera found')

      await codeReader.decodeFromVideoDevice(
        backCamera.deviceId,
        videoRef.current,
        (result, err) => {
          if (result && !scanned) {
            setScanned(true)
            setScanning(false)

            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate([100, 50, 100])

            onScan({
              barcode: result.getText(),
              barcodeType: result.getBarcodeFormat().toString(),
            })

            stopScanner()
          }
        }
      )
    } catch (err) {
      setError(err.message || 'Camera access denied. Please allow camera permission.')
      setScanning(false)
    }
  }, [onScan, scanned])

  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      try {
        BrowserMultiFormatReader.releaseAllStreams()
      } catch {}
      readerRef.current = null
    }
    setScanning(false)
  }, [])

  useEffect(() => {
    startScanner()
    return () => stopScanner()
  }, [])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Camera View */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto w-full">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-48 h-48">
            {/* Corner markers */}
            {[
              'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
            ].map((cls, i) => (
              <div key={i} className={cn('absolute w-8 h-8 border-orange-400', cls)} />
            ))}

            {/* Scan line animation */}
            {scanning && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-400 animate-bounce" />
            )}
          </div>
        </div>

        {/* Scanning indicator */}
        {scanning && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <div className="bg-black/60 rounded-full px-3 py-1.5 flex items-center gap-2">
              <Zap className="h-3 w-3 text-orange-400 animate-pulse" />
              <span className="text-white text-xs">{t('product.scanning')}</span>
            </div>
          </div>
        )}

        {/* Success indicator */}
        {scanned && (
          <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
            <div className="bg-green-500 rounded-full p-3">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          <X className="h-4 w-4 mr-2" /> {t('common.cancel')}
        </Button>
        {error && (
          <Button className="flex-1" onClick={startScanner}>
            <Camera className="h-4 w-4 mr-2" /> Retry
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Point camera at product barcode to auto-fill details
      </p>
    </div>
  )
}
