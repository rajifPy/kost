// pages/admin/dashboard.js - FINAL VERSION yang pasti work
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import RoomList from '../../components/RoomList'
import TenantManagement from '../../components/TenantManagement'
import { useRouter } from 'next/router'

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false)
  const [rooms, setRooms] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      checkAuth()
    }
  }, [mounted])

  async function checkAuth() {
    console.log('🔍 Starting auth check...')
    setAuthLoading(true)
    
    try {
      const { data, error } = await supabase.auth.getUser()
      const user = data?.user
      
      if (error || !user) {
        console.log('❌ No auth user, redirecting...')
        router.push('/admin/login')
        return
      }
      
      console.log('✅ Auth OK:', user.email)
      
      // Small delay to ensure state updates
      setTimeout(() => {
        setAuthLoading(false)
        fetchData()
      }, 100)
      
    } catch (e) {
      console.error('💥 Auth error:', e)
      setAuthLoading(false)
      router.push('/admin/login')
    }
  }

  async function fetchData() {
    console.log('🔄 Starting fetchData...')
    setLoading(true)
    setError(null)
    
    try {
      // Fetch rooms with error handling
      console.log('🏠 Fetching rooms...')
      const roomsPromise = supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch payments with error handling  
      console.log('💳 Fetching payments...')
      const paymentsPromise = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })

      // Execute both queries in parallel
      const [roomsResult, paymentsResult] = await Promise.allSettled([
        roomsPromise,
        paymentsPromise
      ])

      // Handle rooms result
      if (roomsResult.status === 'fulfilled' && !roomsResult.value.error) {
        setRooms(roomsResult.value.data || [])
        console.log('✅ Rooms loaded:', roomsResult.value.data?.length || 0)
      } else {
        console.error('❌ Rooms failed:', roomsResult.reason || roomsResult.value?.error)
        setRooms([])
      }

      // Handle payments result
      if (paymentsResult.status === 'fulfilled' && !paymentsResult.value.error) {
        setPayments(paymentsResult.value.data || [])
        console.log('✅ Payments loaded:', paymentsResult.value.data?.length || 0)
      } else {
        console.error('❌ Payments failed:', paymentsResult.reason || paymentsResult.value?.error)
        setPayments([])
      }

      console.log('🎉 Data fetch completed!')
      
    } catch (error) {
      console.error('💥 Fetch error:', error)
      setError(error.message)
      setRooms([])
      setPayments([])
    }

    // Always set loading to false with delay to ensure rendering
    setTimeout(() => {
      setLoading(false)
      console.log('✅ Loading cleared')
    }, 300)
  }

  async function verifyPayment(payment, action) {
    const paymentName = payment.tenant_name || 'Unknown'
    
    if (!confirm(`${action === 'success' ? 'Accept' : 'Reject'} payment from ${paymentName}?`)) {
      return
    }

    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payment.id, action })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify payment')
      }
      
      // Show better success message
      const message = data.whatsapp_notification?.success 
        ? `✅ Payment ${action}ed successfully!\n📱 WhatsApp sent to ${data.payment.phone}` 
        : `✅ Payment ${action}ed successfully!\n\n⚠️ WhatsApp notification disabled (service not configured)\nPlease inform tenant manually: ${data.payment.phone}`
      
      alert(message)
      
      // Refresh data
      fetchData()
      
    } catch (error) {
      console.error('❌ Verify payment error:', error)
      alert(`Error: ${error.message}`)
    }
  }

  async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/admin/login')
    } catch (error) {
      alert('Error logging out: ' + error.message)
    }
  }

  // Render guards
  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Initializing...</div>
    </div>
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
          <p className="text-xs text-gray-400 mt-2">
            {rooms.length > 0 ? `Loaded ${rooms.length} rooms` : 'Loading rooms...'}
            {payments.length > 0 ? `, ${payments.length} payments` : ', loading payments...'}
          </p>
        </div>
      </div>
    )
  }

  // Calculate stats
  const availableRooms = rooms.filter(r => r.is_available).length
  const occupiedRooms = rooms.length - availableRooms
  const pendingPayments = payments.filter(p => p.status === 'pending').length

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary-700">
          Admin Dashboard
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({rooms.length} rooms, {payments.length} payments)
          </span>
        </h1>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <div className="flex items-start gap-2">
            <span className="text-red-500">❌</span>
            <div>
              <div className="font-medium">Error:</div>
              <div className="text-sm">{error}</div>
              <button 
                onClick={fetchData}
                className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-blue-50">
          <div className="text-2xl font-bold text-blue-600">{rooms.length}</div>
          <div className="text-sm text-blue-800">Total Rooms</div>
        </div>
        <div className="card bg-green-50">
          <div className="text-2xl font-bold text-green-600">{availableRooms}</div>
          <div className="text-sm text-green-800">Available</div>
        </div>
        <div className="card bg-red-50">
          <div className="text-2xl font-bold text-red-600">{occupiedRooms}</div>
          <div className="text-sm text-red-800">Occupied</div>
        </div>
        <div className="card bg-yellow-50">
          <div className="text-2xl font-bold text-yellow-600">{pendingPayments}</div>
          <div className="text-sm text-yellow-800">Pending</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {['overview', 'rooms', 'tenants', 'payments'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 whitespace-nowrap capitalize ${
              activeTab === tab 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent hover:text-primary-600'
            }`}
          >
            {tab}
            {tab === 'rooms' && ` (${rooms.length})`}
            {tab === 'payments' && ` (${payments.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Rooms */}
          <div className="card">
            <h3 className="font-semibold mb-4">Recent Rooms</h3>
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

          {/* Recent Payments */}
          <div className="card">
            <h3 className="font-semibold mb-4">Recent Payments</h3>
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
      )}

      {activeTab === 'rooms' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Rooms Management</h3>
            <button className="btn-primary">Add Room</button>
          </div>
          
          {rooms.length > 0 ? (
            <RoomList rooms={rooms} adminMode={true} />
          ) : (
            <div className="card text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">🏠</div>
              <p className="text-gray-600">No rooms available yet.</p>
              <button className="btn-primary mt-4">Add First Room</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tenants' && (
        <TenantManagement rooms={rooms} />
      )}

      {activeTab === 'payments' && (
        <div>
          <h3 className="font-semibold mb-4 text-lg">Payments Management</h3>
          <div className="space-y-3">
            {payments.map(payment => (
              <div key={payment.id} className="card border-l-4 border-l-primary-500">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{payment.tenant_name}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>📱 {payment.phone}</div>
                      <div>🗓️ {payment.month}</div>
                      {payment.room_number && <div>🏠 Room: {payment.room_number}</div>}
                      <div>📅 {new Date(payment.created_at).toLocaleDateString()}</div>
                      {payment.message && <div>💬 {payment.message}</div>}
                      {payment.receipt_url && (
                        <div>
                          <a 
                            target="_blank" 
                            rel="noreferrer" 
                            href={payment.receipt_url} 
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            View Receipt →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      payment.status === 'success' ? 'bg-green-100 text-green-800' :
                      payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                    {payment.status === 'pending' && (
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => verifyPayment(payment, 'success')} 
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => verifyPayment(payment, 'rejected')} 
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {payments.length === 0 && (
              <div className="card text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💳</div>
                <p>No payments submitted yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export async function getServerSideProps() {
  return { props: {} }
}
