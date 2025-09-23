// pages/admin/dashboard.js - MEGA SIMPLIFIED untuk debug
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false)
  const [rooms, setRooms] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [])

  function addDebugInfo(message) {
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${message}`])
    console.log(message)
  }

  async function checkAuth() {
    addDebugInfo('🔍 Starting auth check...')
    
    try {
      const { data, error } = await supabase.auth.getUser()
      const user = data?.user
      
      if (error || !user) {
        addDebugInfo('❌ No auth user, redirecting...')
        router.push('/admin/login')
        return
      }
      
      addDebugInfo(`✅ Auth OK: ${user.email}`)
      await fetchData()
    } catch (e) {
      addDebugInfo(`💥 Auth error: ${e.message}`)
      router.push('/admin/login')
    }
  }

  async function fetchData() {
    addDebugInfo('🔄 Starting fetchData...')
    setLoading(true)
    setError(null)
    
    try {
      // Test 1: Check Supabase client
      addDebugInfo('📡 Testing Supabase connection...')
      if (!supabase) {
        throw new Error('Supabase client is null')
      }
      
      // Test 2: Simple query first - just count
      addDebugInfo('🔢 Testing simple count query...')
      const { count: roomCount, error: countError } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        addDebugInfo(`❌ Count query failed: ${countError.message}`)
        throw countError
      }
      
      addDebugInfo(`✅ Found ${roomCount} rooms in database`)

      // Test 3: Fetch rooms data
      addDebugInfo('🏠 Fetching rooms data...')
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id, number, title, price, is_available, created_at')
        .limit(10)
      
      if (roomsError) {
        addDebugInfo(`❌ Rooms fetch failed: ${roomsError.message}`)
        throw roomsError
      }
      
      addDebugInfo(`✅ Rooms data fetched: ${roomsData?.length || 0} items`)
      setRooms(roomsData || [])

      // Test 4: Fetch payments data  
      addDebugInfo('💳 Fetching payments data...')
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, tenant_name, phone, month, status, created_at')
        .limit(10)
      
      if (paymentsError) {
        addDebugInfo(`❌ Payments fetch failed: ${paymentsError.message}`)
        // Don't throw error for payments - continue with rooms only
        setPayments([])
      } else {
        addDebugInfo(`✅ Payments data fetched: ${paymentsData?.length || 0} items`)
        setPayments(paymentsData || [])
      }

      addDebugInfo('🎉 Data fetch completed successfully!')
      
    } catch (error) {
      addDebugInfo(`💥 Critical error: ${error.message}`)
      setError(error.message)
      
      // Set empty data to prevent crashes
      setRooms([])
      setPayments([])
    } finally {
      addDebugInfo('✅ Setting loading to false')
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/admin/login')
    } catch (error) {
      alert('Error logging out: ' + error.message)
    }
  }

  if (!mounted) {
    return <div>Initializing...</div>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
            <p className="text-xs text-gray-400 mt-2">Debugging in progress...</p>
          </div>
          
          {/* Debug Information */}
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs max-h-64 overflow-y-auto">
            <div className="font-bold mb-2">🔍 Debug Log:</div>
            {debugInfo.map((info, index) => (
              <div key={index} className="mb-1">{info}</div>
            ))}
            {debugInfo.length === 0 && <div>Waiting for debug info...</div>}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">Database Error</h2>
            <p className="text-red-800 mb-4">{error}</p>
            <button 
              onClick={fetchData}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-2"
            >
              Retry
            </button>
            <button 
              onClick={handleLogout}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
          
          {/* Debug Information */}
          <div className="mt-4 bg-gray-900 text-green-400 p-4 rounded-lg text-xs max-h-48 overflow-y-auto text-left">
            <div className="font-bold mb-2">🔍 Debug Log:</div>
            {debugInfo.map((info, index) => (
              <div key={index} className="mb-1">{info}</div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // SUCCESS! Show dashboard
  const availableRooms = rooms.filter(r => r.is_available).length
  const occupiedRooms = rooms.length - availableRooms
  const pendingPayments = payments.filter(p => p.status === 'pending').length

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary-700">Admin Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Success Message */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
        <div className="flex items-start gap-2">
          <span className="text-green-500">✅</span>
          <div>
            <div className="font-medium">Dashboard Loaded Successfully!</div>
            <div className="text-sm">All systems operational</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-blue-50">
          <div className="text-2xl font-bold text-blue-600">{rooms.length}</div>
          <div className="text-sm text-blue-800">Total Rooms</div>
        </div>
        <div className="card bg-green-50">
          <div className="text-2xl font-bold text-green-600">{availableRooms}</div>
          <div className="text-sm text-green-800">Available Rooms</div>
        </div>
        <div className="card bg-red-50">
          <div className="text-2xl font-bold text-red-600">{occupiedRooms}</div>
          <div className="text-sm text-red-800">Occupied Rooms</div>
        </div>
        <div className="card bg-yellow-50">
          <div className="text-2xl font-bold text-yellow-600">{pendingPayments}</div>
          <div className="text-sm text-yellow-800">Pending Payments</div>
        </div>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Rooms ({rooms.length})</h3>
          <div className="space-y-2">
            {rooms.slice(0, 5).map(room => (
              <div key={room.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{room.title || `Room ${room.number}`}</div>
                  <div className="text-sm text-gray-600">Rp {room.price?.toLocaleString('id-ID') || '0'}</div>
                </div>
                <span className={room.is_available ? 'pill-available' : 'pill-full'}>
                  {room.is_available ? 'Available' : 'Occupied'}
                </span>
              </div>
            ))}
            {rooms.length === 0 && (
              <div className="text-center text-gray-500 py-4">No rooms found</div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Payments ({payments.length})</h3>
          <div className="space-y-2">
            {payments.slice(0, 5).map(payment => (
              <div key={payment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{payment.tenant_name}</div>
                  <div className="text-sm text-gray-600">{payment.month}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  payment.status === 'success' ? 'bg-green-100 text-green-800' :
                  payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {payment.status}
                </span>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="text-center text-gray-500 py-4">No payments found</div>
            )}
          </div>
        </div>
      </div>

      {/* Debug Information - Collapsible */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
          🔍 Show Debug Information ({debugInfo.length} logs)
        </summary>
        <div className="mt-2 bg-gray-900 text-green-400 p-4 rounded-lg text-xs max-h-48 overflow-y-auto">
          {debugInfo.map((info, index) => (
            <div key={index} className="mb-1">{info}</div>
          ))}
        </div>
      </details>
    </div>
  )
}

export async function getServerSideProps() {
  return { props: {} }
}
