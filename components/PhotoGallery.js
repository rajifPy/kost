// components/PhotoGallery.js - Enhanced Modern Slider
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function PhotoGallery() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [galleryImages, setGalleryImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const autoPlayRef = useRef(null)
  const transitionTimeoutRef = useRef(null)

  useEffect(() => {
    fetchGalleryImages()
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    }
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
          description: 'This is a sample image. Admin can add photos via dashboard.',
          id: 'sample-1'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Auto-play functionality with smooth transitions
  useEffect(() => {
    if (!isAutoPlaying || galleryImages.length <= 1 || isTransitioning) return

    if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    
    autoPlayRef.current = setInterval(() => {
      goToNext(true)
    }, 5000) // Change every 5 seconds

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isAutoPlaying, galleryImages.length, currentIndex, isTransitioning])

  const goToSlide = (index, isAuto = false) => {
    if (isTransitioning || index === currentIndex) return
    
    setIsTransitioning(true)
    setCurrentIndex(index)
    
    if (!isAuto) {
      setIsAutoPlaying(false)
      // Resume auto-play after 8 seconds of inactivity
      setTimeout(() => setIsAutoPlaying(true), 8000)
    }
    
    // Clear transition state after animation completes
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false)
    }, 800) // Match CSS transition duration
  }

  const goToPrevious = (isAuto = false) => {
    const newIndex = currentIndex === 0 ? galleryImages.length - 1 : currentIndex - 1
    goToSlide(newIndex, isAuto)
  }

  const goToNext = (isAuto = false) => {
    const newIndex = currentIndex === galleryImages.length - 1 ? 0 : currentIndex + 1
    goToSlide(newIndex, isAuto)
  }

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (galleryImages.length <= 1) return
      
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case ' ':
          e.preventDefault()
          setIsAutoPlaying(prev => !prev)
          break
        case 'Escape':
          setIsAutoPlaying(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [galleryImages.length, currentIndex])

  // Don't render if no images
  if (loading) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-6">Galeri Foto Kost</h2>
        <div className="card">
          <div className="h-64 md:h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <div className="text-4xl mb-2">📷</div>
              <div className="text-sm">Loading gallery...</div>
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
            🔄 Retry
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
        
        {galleryImages.length > 1 && (
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <div className={`w-2 h-2 rounded-full transition-colors ${
                isAutoPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span>{isAutoPlaying ? 'Auto-play' : 'Manual'}</span>
            </div>
            
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`px-3 py-1 rounded-full text-xs transition-all duration-300 ${
                isAutoPlaying 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isAutoPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden bg-gradient-to-br from-white to-gray-50">
        {/* Main Gallery Container */}
        <div 
          className="relative group cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Image Container with 3D-like transitions */}
          <div className="relative h-64 md:h-96 overflow-hidden rounded-xl bg-gray-900 shadow-inner">
            <div 
              className={`flex transition-all duration-800 ease-out h-full ${
                isTransitioning ? 'transform-gpu' : ''
              }`}
              style={{ 
                transform: `translateX(-${currentIndex * 100}%)`,
                filter: isTransitioning ? 'brightness(0.9)' : 'brightness(1)'
              }}
            >
              {galleryImages.map((image, index) => (
                <div 
                  key={image.id || index} 
                  className="w-full flex-shrink-0 relative overflow-hidden"
                >
                  {/* Background blur effect */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center filter blur-sm scale-110"
                    style={{ backgroundImage: `url(${image.url})` }}
                  />
                  
                  {/* Main image */}
                  <img
                    src={image.url}
                    alt={image.title}
                    className="relative w-full h-full object-cover z-10 transition-transform duration-700"
                    style={{
                      transform: index === currentIndex 
                        ? 'scale(1)' 
                        : 'scale(1.05)'
                    }}
                    onError={(e) => {
                      console.warn('Image failed to load:', image.url)
                      e.target.src = 'https://via.placeholder.com/800x500/e5e7eb/6b7280?text=Foto+Tidak+Tersedia'
                    }}
                    loading={index <= 2 ? 'eager' : 'lazy'}
                  />
                  
                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 z-20"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 z-20"></div>
                  
                  {/* Image Info with animations */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-30 transform transition-all duration-500">
                    <div className={`transition-all duration-700 ${
                      index === currentIndex 
                        ? 'translate-y-0 opacity-100' 
                        : 'translate-y-4 opacity-0'
                    }`}>
                      <h3 className="font-bold text-xl md:text-2xl mb-2 drop-shadow-lg">
                        {image.title}
                      </h3>
                      <p className="text-sm md:text-base opacity-90 drop-shadow-md leading-relaxed">
                        {image.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Shimmer effect during transition */}
                  {isTransitioning && index === currentIndex && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer z-40"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation Arrows - Enhanced design */}
            {galleryImages.length > 1 && (
              <>
                <button 
                  onClick={() => goToPrevious()}
                  disabled={isTransitioning}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => goToNext()}
                  disabled={isTransitioning}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image Counter with modern design */}
            {galleryImages.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg">
                <span className="text-primary-300">{currentIndex + 1}</span>
                <span className="mx-1 opacity-60">/</span>
                <span className="opacity-80">{galleryImages.length}</span>
              </div>
            )}

            {/* Loading indicator during transitions */}
            {isTransitioning && (
              <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
          </div>

          {/* Enhanced Progress Dots */}
          {galleryImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  disabled={isTransitioning}
                  className={`transition-all duration-500 rounded-full ${
                    index === currentIndex 
                      ? 'w-8 h-3 bg-primary-500 shadow-lg' 
                      : 'w-3 h-3 bg-gray-300 hover:bg-gray-400 hover:scale-125'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              ))}
            </div>
          )}

          {/* Enhanced Progress Bar */}
          {isAutoPlaying && galleryImages.length > 1 && (
            <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-100 ease-linear rounded-full"
                style={{ 
                  width: `${((currentIndex + 1) / galleryImages.length) * 100}%`,
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
                }}
              />
            </div>
          )}
        </div>

        {/* Enhanced Thumbnail Preview */}
        {galleryImages.length > 1 && (
          <div className="hidden lg:flex gap-3 mt-6 overflow-x-auto pb-2 scrollbar-hide">
            {galleryImages.map((image, index) => (
              <button
                key={image.id || index}
                onClick={() => goToSlide(index)}
                disabled={isTransitioning}
                className={`flex-shrink-0 rounded-lg overflow-hidden border-3 transition-all duration-500 ${
                  index === currentIndex 
                    ? 'border-primary-500 scale-105 shadow-lg shadow-primary-500/25' 
                    : 'border-transparent hover:border-gray-300 hover:scale-110'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <img
                  src={image.url}
                  alt={`Thumbnail ${image.title}`}
                  className="w-20 h-14 object-cover transition-transform duration-300"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/80x56/e5e7eb/6b7280?text=T'
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Gallery Controls */}
        {galleryImages.length > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>⌨️</span>
                <span className="hidden sm:inline">Use ← → keys or swipe</span>
                <span className="sm:hidden">Swipe to navigate</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPrevious()}
                disabled={isTransitioning}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous (←)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={() => goToNext()}
                disabled={isTransitioning}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next (→)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Single Image Info */}
        {galleryImages.length === 1 && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
              <span>📷</span>
              <span>{galleryImages[0].title}</span>
            </div>
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

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        
        .animate-shimmer {
          animation: shimmer 1s ease-out;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .border-3 {
          border-width: 3px;
        }
      `}</style>
    </section>
  )
}
