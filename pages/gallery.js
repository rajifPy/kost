// pages/gallery.js - Full Parallax Gallery Page
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

export default function GalleryPage() {
  const [galleryImages, setGalleryImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [scrollY, setScrollY] = useState(0)
  const observerRef = useRef(null)

  useEffect(() => {
    fetchGalleryImages()
    
    // Smooth scroll effect
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Intersection Observer for lazy loading animations
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up')
            entry.target.style.opacity = '1'
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    // Observe all gallery items
    if (observerRef.current && galleryImages.length > 0) {
      const items = document.querySelectorAll('.gallery-item')
      items.forEach((item) => {
        observerRef.current.observe(item)
      })
    }
  }, [galleryImages])

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
      
      const transformedImages = (data || []).map(item => ({
        url: item.image_url,
        title: item.title,
        description: item.description,
        id: item.id
      }))
      
      setGalleryImages(transformedImages)
      
    } catch (error) {
      console.error('Fetch gallery error:', error)
      setError('Failed to load gallery images')
      
      // Fallback sample images
      setGalleryImages([
        {
          url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=600&fit=crop',
          title: 'Sample Room 1',
          description: 'Admin can add photos via dashboard.',
          id: 'sample-1'
        },
        {
          url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=600&fit=crop',
          title: 'Sample Room 2',
          description: 'Admin can add photos via dashboard.',
          id: 'sample-2'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const openLightbox = (image) => {
    setSelectedImage(image)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setSelectedImage(null)
    document.body.style.overflow = 'auto'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Hero Skeleton */}
        <div className="relative h-96 bg-gray-200 animate-pulse">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-64 h-12 bg-gray-300 rounded-lg mx-auto mb-4"></div>
              <div className="w-96 h-6 bg-gray-300 rounded-lg mx-auto"></div>
            </div>
          </div>
        </div>

        {/* Gallery Skeleton */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[4/3] bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Parallax Hero Section */}
      <section className="relative h-[70vh] overflow-hidden">
        {/* Parallax Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: galleryImages[0] 
              ? `url(${galleryImages[0].url})` 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            transform: `translateY(${scrollY * 0.5}px)`,
            willChange: 'transform'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
        </div>

        {/* Hero Content */}
        <div 
          className="relative h-full flex flex-col items-center justify-center text-white px-4 z-10"
          style={{
            transform: `translateY(${scrollY * 0.3}px)`,
            opacity: Math.max(0, 1 - scrollY / 500),
            willChange: 'transform, opacity'
          }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-4 text-center drop-shadow-2xl">
            Galeri Foto Kost
          </h1>
          <p className="text-xl md:text-2xl text-center max-w-2xl mb-8 drop-shadow-lg">
            Lihat koleksi foto kamar dan fasilitas kost kami
          </p>
          <div className="flex gap-4">
            <Link href="/">
              <span className="px-6 py-3 bg-white text-primary-700 rounded-full font-semibold hover:bg-gray-100 transition-all cursor-pointer shadow-xl hover:scale-105">
                🏠 Kembali ke Home
              </span>
            </Link>
            <button
              onClick={() => window.scrollTo({ top: window.innerHeight * 0.7, behavior: 'smooth' })}
              className="px-6 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-all shadow-xl hover:scale-105"
            >
              📷 Lihat Galeri
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white shadow-lg sticky top-16 z-40 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm md:text-base">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📷</span>
                <span className="font-semibold text-gray-700">
                  {galleryImages.length} Foto
                </span>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-amber-600">
                  <span className="text-xl">⚠️</span>
                  <span className="text-sm">Using fallback images</span>
                </div>
              )}
            </div>
            <button
              onClick={fetchGalleryImages}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>🔄</span>
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>
      </section>

      {/* Gallery Grid with Parallax Items */}
      <section className="container mx-auto px-4 py-16">
        {galleryImages.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              Galeri Masih Kosong
            </h3>
            <p className="text-gray-600 mb-6">
              Admin dapat menambahkan foto melalui dashboard
            </p>
            <Link href="/admin/dashboard">
              <span className="btn-primary cursor-pointer">
                Ke Dashboard Admin
              </span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryImages.map((image, index) => {
              const parallaxOffset = (index % 3) * 50
              const parallaxSpeed = 0.1 + (index % 3) * 0.05
              
              return (
                <div
                  key={image.id}
                  className="gallery-item opacity-0 transition-opacity duration-700"
                  style={{
                    transform: `translateY(${(scrollY - parallaxOffset) * parallaxSpeed}px)`,
                    willChange: 'transform'
                  }}
                >
                  <div 
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-gray-900"
                    onClick={() => openLightbox(image)}
                  >
                    {/* Image */}
                    <img
                      src={image.url}
                      alt={image.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/800x600/e5e7eb/6b7280?text=Image+Not+Found'
                      }}
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Info Overlay */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                        <h3 className="text-xl font-bold mb-2 drop-shadow-lg">
                          {image.title}
                        </h3>
                        <p className="text-sm text-gray-200 line-clamp-2 drop-shadow-md">
                          {image.description}
                        </p>
                      </div>
                    </div>

                    {/* Hover Icon */}
                    <div className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 backdrop-blur-sm">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>

                    {/* Image Number Badge */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                      #{index + 1}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Call to Action Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 py-16 mt-12">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tertarik dengan Kamar Kami?
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Lihat daftar kamar lengkap dan lakukan pembayaran dengan mudah
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <span className="px-8 py-4 bg-white text-primary-700 rounded-full font-semibold hover:bg-gray-100 transition-all cursor-pointer shadow-xl hover:scale-105 inline-block">
                🏠 Lihat Daftar Kamar
              </span>
            </Link>
            <Link href="/payment">
              <span className="px-8 py-4 bg-primary-400 text-white rounded-full font-semibold hover:bg-primary-500 transition-all cursor-pointer shadow-xl hover:scale-105 inline-block">
                💳 Bayar Sewa Sekarang
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-10 hover:scale-110"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image Container */}
          <div 
            className="max-w-7xl max-h-[90vh] relative animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            
            {/* Image Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
              <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                {selectedImage.title}
              </h3>
              <p className="text-gray-200 drop-shadow-md">
                {selectedImage.description}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 backdrop-blur-md px-4 py-2 rounded-full">
            Click anywhere to close
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Performance optimization */
        .gallery-item {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }
      `}</style>
    </div>
  )
}
