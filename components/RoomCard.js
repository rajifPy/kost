// components/RoomCard.js
import { useState } from 'react'

export default function RoomCard({ room, adminMode = false, onToggle, onEdit, onDelete }) {
  const [imageError, setImageError] = useState({})
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const handleImageError = (index) => {
    setImageError(prev => ({ ...prev, [index]: true }))
  }

  const nextImage = () => {
    if (room.images && room.images.length > 1) {
      setCurrentImageIndex(prev => 
        prev === room.images.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevImage = () => {
    if (room.images && room.images.length > 1) {
      setCurrentImageIndex(prev => 
        prev === 0 ? room.images.length - 1 : prev - 1
      )
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'Harga belum ditetapkan'
    return `Rp ${parseInt(price).toLocaleString('id-ID')}`
  }

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Image Section */}
      <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden mb-4">
        {room.images && room.images.length > 0 ? (
          <>
            <img
              src={room.images[currentImageIndex]}
              alt={`${room.title || room.number} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
              onError={() => handleImageError(currentImageIndex)}
              style={{ display: imageError[currentImageIndex] ? 'none' : 'block' }}
            />
            
            {imageError[currentImageIndex] && (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🏠</div>
                  <div className="text-sm">Gambar tidak tersedia</div>
                </div>
              </div>
            )}

            {/* Image Navigation */}
            {room.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70 transition-opacity"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70 transition-opacity"
                  aria-label="Next image"
                >
                  →
                </button>
                
                {/* Image Indicators */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {room.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex 
                          ? 'bg-white' 
                          : 'bg-white bg-opacity-50'
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🏠</div>
              <div className="text-sm">Tidak ada gambar</div>
            </div>
          </div>
        )}

        {/* Availability Badge */}
        <div className="absolute top-2 right-2">
          <span className={room.is_available ? 'pill-available' : 'pill-full'}>
            {room.is_available ? 'Tersedia' : 'Terisi'}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-800 mb-1">
              {room.title || `Kamar ${room.number}`}
            </h3>
            <div className="text-sm text-gray-600 mb-2">
              📍 Kamar {room.number}
            </div>
          </div>
        </div>

        {/* Description */}
        {room.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
            {room.description}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold text-primary-600">
            {formatPrice(room.price)}
            <span className="text-sm font-normal text-gray-500">/bulan</span>
          </div>
        </div>

        {/* Admin Actions */}
        {adminMode && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <button
              onClick={() => onToggle && onToggle(room)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                room.is_available
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
              title={room.is_available ? 'Tandai sebagai terisi' : 'Tandai sebagai tersedia'}
            >
              {room.is_available ? '🔒 Set Terisi' : '🔓 Set Tersedia'}
            </button>
            
            <button
              onClick={() => onEdit && onEdit(room)}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
              title="Edit kamar"
            >
              ✏️ Edit
            </button>
            
            <button
              onClick={() => onDelete && onDelete(room)}
              className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors"
              title="Hapus kamar"
            >
              🗑️ Hapus
            </button>
          </div>
        )}

        {/* User Actions */}
        {!adminMode && (
          <div className="flex gap-2 pt-3 border-t">
            <a
              href="/payment"
              className="btn-primary flex-1 text-center"
            >
              💳 Bayar Sewa
            </a>
            
            <a
              href={`https://wa.me/6281234567890?text=Halo, saya tertarik dengan ${room.title || `Kamar ${room.number}`}. Bisakah saya mendapat informasi lebih lanjut?`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
              title="Tanya via WhatsApp"
            >
              📱
            </a>
          </div>
        )}
      </div>

      {/* Room Features (if available) */}
      {!adminMode && room.description && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500">
            <div className="flex flex-wrap gap-2">
              {room.description.toLowerCase().includes('ac') && (
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">❄️ AC</span>
              )}
              {room.description.toLowerCase().includes('kipas') && (
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">🌀 Kipas</span>
              )}
              {room.description.toLowerCase().includes('wifi') && (
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded">📶 WiFi</span>
              )}
              {room.description.toLowerCase().includes('kamar mandi') && (
                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded">🚿 Kamar Mandi</span>
              )}
              {room.description.toLowerCase().includes('lemari') && (
                <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded">👔 Lemari</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
