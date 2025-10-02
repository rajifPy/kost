// components/Header.js - Updated with Gallery navigation
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Header() {
  const router = useRouter()
  
  const isActive = (path) => {
    return router.pathname === path
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <span className="text-xl font-bold text-primary-700 cursor-pointer hover:text-primary-800 transition-colors">
               Kost Anda
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/">
              <span className={`px-3 py-2 rounded-lg text-sm md:text-base font-medium transition-all cursor-pointer ${
                isActive('/') 
                  ? 'bg-primary-500 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                Home
              </span>
            </Link>

            <Link href="/gallery">
              <span className={`px-3 py-2 rounded-lg text-sm md:text-base font-medium transition-all cursor-pointer ${
                isActive('/gallery') 
                  ? 'bg-primary-500 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                Galeri Kost
              </span>
            </Link>

            <Link href="/payment">
              <span className={`px-3 py-2 rounded-lg text-sm md:text-base font-medium transition-all cursor-pointer ${
                isActive('/payment') 
                  ? 'bg-primary-500 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                Bayar Sewa
              </span>
            </Link>

            <Link href="/admin/login">
              <span className="px-3 py-2 rounded-lg text-sm md:text-base font-medium text-gray-600 hover:bg-gray-100 transition-all cursor-pointer">
                🔐 Admin
              </span>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
