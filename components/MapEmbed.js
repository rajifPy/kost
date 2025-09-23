// components/MapEmbed.js
import { useState } from 'react'

export default function MapEmbed({ 
  src, 
  width = "100%", 
  height = "300", 
  title = "Lokasi Kost",
  className = ""
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const handleLoad = () => {
    setLoading(false)
  }

  const handleError = () => {
    setLoading(false)
    setError(true)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading State */}
      {loading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg"
          style={{ height }}
        >
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
            <div className="text-sm">Memuat peta...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div 
          className="flex items-center justify-center bg-gray-100 rounded-lg border"
          style={{ height }}
        >
          <div className="text-center text-gray-500 p-4">
            <div className="text-4xl mb-2">🗺️</div>
            <div className="text-sm font-medium mb-2">Tidak dapat memuat peta</div>
            <div className="text-xs text-gray-400">
              Periksa koneksi internet atau coba refresh halaman
            </div>
            <button 
              onClick={() => {
                setError(false)
                setLoading(true)
              }}
              className="mt-3 px-3 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Map Iframe */}
      {!error && (
        <iframe
          src={src}
          width={width}
          height={height}
          title={title}
          className="rounded-lg border"
          style={{ 
            border: 0,
            display: loading ? 'none' : 'block'
          }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Map Controls Overlay */}
      {!loading && !error && (
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button
            onClick={() => window.open(src.replace('/embed?', '/place/'), '_blank')}
            className="bg-white shadow-md rounded p-1 hover:bg-gray-50 transition-colors"
            title="Buka di Google Maps"
          >
            <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// Alternative component for simple embed without controls
export function SimpleMapEmbed({ src, height = "300px", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <iframe
        src={src}
        width="100%"
        height={height}
        title="Lokasi Kost"
        className="rounded-lg border"
        style={{ border: 0 }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
