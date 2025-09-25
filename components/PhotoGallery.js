// components/PhotoGallery.js - Updated to use database
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function PhotoGallery() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [galleryImages, setGalleryImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchGalleryImages()
  }, [])

  async function fetchGalleryImages() {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      
      if (error) throw error
      
      // Transform data to match expected format
      const transformedImages = (data || []).map(item => ({
        url: item.image_url,
        title: item.title,
        description: item.description,
        id: item.id
      }))
      
      setGalleryImages(transformedImages)
      
      // Reset current index if it's out of range
      if (transformedImages.length > 0 && currentIndex >= transformedImages.length) {
        setCurrentIndex(0)
      }
      
    } catch (error) {
      console.error('Fetch gallery error:', error)
      setError('Failed to load gallery images')
      
      // Fallback to sample images if database fails
      setGalleryImages([
        {
          url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=500&fit=crop',
          title: 'Sample Room',
          description: 'This is a sample image. Admin can add photos via dashboard.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || galleryImages.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => 
        prevIndex === galleryImages.length - 1 ? 0 : prevIndex + 1
      )
    }, 4000) // Change every 4 seconds

    return () => clearInterval(interval)
  }, [isAutoPlaying, galleryImages.length, currentIndex])

  const goToSlide = (index) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? galleryImages.length - 1 : currentIndex - 1
    goToSlide(newIndex)
  }

  const goToNext = () => {
    const newIndex = currentIndex === galleryImages.length - 1 ? 0 : currentIndex + 1
    goToSlide(newIndex)
  }

  // Don't render if no images
  if (loading) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-6">Galeri Foto Kost</h2>
        <div className="card">
          <div className="h-64 md:h-80 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-gray-400">
              <div className="text-4xl mb-2">📷</div>
              <div>Loading gallery...</div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error && galleryImages.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-6">Galeri Foto Kost</h2>
        <div className="card text-center py-12">
          <div className="text-gray-400 text-4xl mb-2">📷</div>
          <p className="text-gray-600 mb-2">Gallery is not available</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button 
            onClick={fetchGalleryImages}
            className="btn-secondary mt-3"
          >
            Retry
          </button>
        </div>
      </section>
    )
  }

  if (galleryImages.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-6">Galeri Foto Kost</h2>
        <div className="card text-center py-12">
          <div className="text-gray-400 text-4xl mb-2">📷</div>
          <p className="text-gray-600">Gallery photos will appear here once admin adds them</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary-700">
          Galeri Foto Kost
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({galleryImages.length} foto)
          </span>
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className={`w-2 h-2 rounded-full ${isAutoPlaying && galleryImages.length > 1 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          {galleryImages.length > 1 ? (isAutoPlaying ? 'Auto-play aktif' : 'Manual') : 'Single image'}
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Main Gallery Container */}
        <div className="relative group">
          {/* Image Container with Smooth Transitions */}
          <div className="relative h-64 md:h-80 overflow-hidden rounded-lg bg-gray-100">
            <div 
              className="flex transition-transform duration-700 ease-in-out h-full"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {galleryImages.map((image, index) => (
                <div key={image.id || index} className="w-full flex-shrink-0 relative">
                  <img
                    src={image.url}
                    alt={image.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.warn('Image failed to load:', image.url)
                      e.target.src = 'https://via.placeholder.com/800x500/e5e7eb/6b7280?text=Foto+Tidak+Tersedia'
                    }}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  
                  {/* Image Info */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="font-semibold text-lg mb-1">{image.title}</h3>
                    <p className="text-sm opacity-90">{image.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows - Show on hover and only if more than 1 image */}
            {galleryImages.length > 1 && (
              <>
                <button 
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button 
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image Counter - Only show if more than 1 image */}
            {galleryImages.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {galleryImages.length}
              </div>
            )}
          </div>

          {/* Dot Indicators - Only show if more than 1 image */}
          {galleryImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'bg-primary-500 scale-125' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Thumbnail Preview - Hidden on mobile, only show if more than 1 image */}
          {galleryImages.length > 1 && (
            <div className="hidden md:flex gap-2 mt-4 overflow-x-auto pb-2">
              {galleryImages.map((image, index) => (
                <button
                  key={image.id || index}
                  onClick={() => goToSlide(index)}
                  className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                    index === currentIndex 
                      ? 'border-primary-500 scale-110' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`Thumbnail ${image.title}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/64x48/e5e7eb/6b7280?text=T'
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Progress Bar - Only show if auto-playing and more than 1 image */}
          {isAutoPlaying && galleryImages.length > 1 && (
            <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-100 ease-linear"
                style={{ 
                  width: `${((currentIndex + 1) / galleryImages.length) * 100}%`,
                  animation: 'progressPulse 4s ease-in-out infinite'
                }}
              />
            </div>
          )}
        </div>

        {/* Gallery Controls - Only show if more than 1 image */}
        {galleryImages.length > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  isAutoPlaying 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isAutoPlaying ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    Play
                  </>
                )}
              </button>
              
              <span className="text-sm text-gray-500">
                Swipe atau klik untuk navigasi
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevious}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Previous"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={goToNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Next"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Single Image Info */}
        {galleryImages.length === 1 && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center text-sm text-gray-600">
            📷 {galleryImages[0].title} - {galleryImages[0].description}
          </div>
        )}

        {/* Refresh Button for Error Recovery */}
        {error && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <button 
              onClick={fetchGalleryImages}
              className="btn-secondary text-sm"
            >
              🔄 Refresh Gallery
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes progressPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  )
}
