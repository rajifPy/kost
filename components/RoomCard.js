// components/RoomCard.js - FIXED VERSION
export default function RoomCard({ room, onToggle, onEdit, onDelete, adminMode = false }) {
  // Defensive programming - ensure room exists
  if (!room) {
    return (
      <div className="card border-red-200">
        <div className="text-red-600 text-center py-4">
          <div className="text-2xl mb-2">⚠️</div>
          <p>Room data is missing</p>
        </div>
      </div>
    )
  }

  // Safe image handling
  const hasImages = room.images && Array.isArray(room.images) && room.images.length > 0
  const firstImage = hasImages ? room.images[0] : null
  const additionalImages = hasImages && room.images.length > 1 ? room.images.slice(1, 5) : []

  return (
    <div className="card transform hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
      <div className="flex gap-4">
        {/* Image Section */}
        <div className="w-28 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {firstImage ? (
            <img 
              src={firstImage} 
              alt={`Room ${room.number}`} 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.warn('Image failed to load:', firstImage)
                e.target.style.display = 'none'
                e.target.parentElement.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center text-sm text-gray-400">
                    <div>📷<br/>Image Error</div>
                  </div>
                `
              }}
              onLoad={(e) => {
                // Image loaded successfully - could add success analytics here
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              <div className="text-center">
                📷
                <br />
                <span className="text-xs">No image</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-primary-700 truncate">
              {room.title || `Room ${room.number || 'Unknown'}`}
            </h3>
            <span className={room.is_available ? 'pill-available' : 'pill-full'}>
              {room.is_available ? 'Available' : 'Occupied'}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {room.description || 'No description available'}
          </p>

          <div className="flex justify-between items-center">
            <div className="text-lg font-bold text-primary-600">
              Rp {(room.price || 0).toLocaleString('id-ID')}/bulan
            </div>

            {/* Admin Action Buttons */}
            {adminMode && (
              <div className="flex gap-1">
                {onToggle && (
                  <button 
                    onClick={() => onToggle(room)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      room.is_available 
                        ? 'bg-yellow-600 hover:bg-yellow-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                    title={room.is_available ? 'Mark as Occupied' : 'Mark as Available'}
                  >
                    {room.is_available ? 'Mark Occupied' : 'Mark Available'}
                  </button>
                )}
                
                {onEdit && (
                  <button 
                    onClick={() => onEdit(room)}
                    className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    title="Edit Room"
                  >
                    Edit
                  </button>
                )}
                
                {onDelete && (
                  <button 
                    onClick={() => onDelete(room)}
                    className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                    title="Delete Room"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Additional Images Gallery */}
      {additionalImages.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500 mb-1">
            Gallery ({room.images.length} photos)
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {additionalImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`Room ${room.number} - ${index + 2}`}
                className="w-12 h-8 object-cover rounded border flex-shrink-0 hover:scale-110 transition-transform cursor-pointer"
                onClick={() => {
                  // Open image in new tab
                  window.open(img, '_blank')
                }}
                onError={(e) => {
                  console.warn('Gallery image failed to load:', img)
                  e.target.style.display = 'none'
                }}
                title="Click to view full size"
              />
            ))}
            {room.images.length > 5 && (
              <div 
                className="w-12 h-8 bg-gray-200 rounded border flex-shrink-0 flex items-center justify-center text-xs text-gray-500 cursor-pointer hover:bg-gray-300 transition-colors"
                title={`${room.images.length - 5} more images`}
              >
                +{room.images.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Room Number Badge (for easy identification) */}
      {room.number && (
        <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
          {room.number}
        </div>
      )}
    </div>
  )
}
