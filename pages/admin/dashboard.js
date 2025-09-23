// pages/admin/dashboard.js - FIXED VERSION untuk mengatasi infinite loading
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
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [newRoom, setNewRoom] = useState({
    number: '',
    title: '',
    description: '',
    price: '',
    is_available: true
  })
  const [roomImages, setRoomImages] = useState([])
  const [editRoomImages, setEditRoomImages] = useState([])
  const [imageUploading, setImageUploading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState(null) // Tambah state error
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [router])

  async function checkAuth() {
    setAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.getUser()
      const user = data?.user
      
      if (error || !user) {
        console.log('No authenticated user, redirecting to login')
        router.push('/admin/login')
        return
      }
      
      console.log('Authenticated user found:', user.email)
      await fetchData()
    } catch (e) {
      console.error('checkAuth error:', e)
      router.push('/admin/login')
    } finally {
      setAuthLoading(false)
    }
  }

  async function fetchData() {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Starting data fetch...')
      
      // FETCH ROOMS - Simple tanpa join
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (roomsError) {
        console.error('❌ Rooms fetch error:', roomsError)
        throw new Error('Failed to fetch rooms: ' + roomsError.message)
      }

      console.log('✅ Rooms fetched:', roomsData?.length || 0)

      // FETCH PAYMENTS - Simplified query tanpa complex join
      let paymentsData = []
      let paymentsError = null

      try {
        // Coba query simple dulu
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false })
        
        paymentsData = data || []
        paymentsError = error
        
        console.log('✅ Payments fetched (simple):', paymentsData?.length || 0)
      } catch (err) {
        console.error('❌ Payments fetch error:', err)
        paymentsError = err
        paymentsData = []
      }

      // Set data meskipun payments gagal
      setRooms(roomsData || [])
      setPayments(paymentsData)
      
      if (paymentsError) {
        console.warn('⚠️ Payments fetch failed, but continuing with rooms data')
        setError('Failed to load payments data. Rooms loaded successfully.')
      }

      console.log('📊 Data fetch completed:', {
        rooms: roomsData?.length || 0,
        payments: paymentsData?.length || 0,
        hasError: !!paymentsError
      })

    } catch (error) {
      console.error('💥 Critical fetch error:', error)
      setError(`Failed to load dashboard: ${error.message}`)
      
      // Set minimal data to prevent complete failure
      setRooms([])
      setPayments([])
    } finally {
      // PENTING: Selalu set loading false
      setLoading(false)
      console.log('✅ Loading state cleared')
    }
  }

  async function verifyPayment(payment, action) {
    const paymentName = payment.tenant_name || payment.tenants?.name || 'Unknown'
    
    if (!confirm(`${action === 'success' ? 'Accept' : 'Reject'} payment from ${paymentName}?`)) {
      return
    }

    try {
      console.log('🔄 Verifying payment:', payment.id, action)
      
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payment.id, action })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify payment')
      }
      
      console.log('✅ Payment verified successfully:', data)
      
      // Refresh data setelah berhasil
      await fetchData()
      
      // Show appropriate message
      const message = data.whatsapp_notification?.success 
        ? `Payment ${action}ed successfully! ✅\nWhatsApp notification sent to ${data.payment.phone}` 
        : `Payment ${action}ed successfully! ✅\n\n⚠️ WhatsApp notification failed:\n${data.whatsapp_notification?.error || 'Service not configured'}\n\nPlease inform the tenant manually.`
      
      alert(message)
      
    } catch (error) {
      console.error('❌ Verify payment error:', error)
      alert(`Error updating payment: ${error.message}\n\nPlease try again or contact support.`)
    }
  }

  // Fungsi lainnya tetap sama...
  async function toggleRoom(room) {
    try {
      console.log('Toggling room availability:', room.number, !room.is_available)
      const { error } = await supabase
        .from('rooms')
        .update({ 
          is_available: !room.is_available,
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id)
      
      if (error) throw error
      
      await fetchData()
      console.log('Room toggled successfully')
    } catch (error) {
      console.error('Toggle room error:', error)
      alert('Error updating room: ' + error.message)
    }
  }

  function handleEditRoom(room) {
    console.log('Editing room:', room.number)
    setEditingRoom({
      ...room,
      price: room.price?.toString() || ''
    })
  }

  async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      console.log('Logged out successfully')
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
      alert('Error logging out: ' + error.message)
    }
  }

  // Early returns untuk loading states
  if (!mounted) {
    return null
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
          <p className="text-gray-600">Loading admin dashboard...</p>
          <p className="text-xs text-gray-400 mt-2">If this takes too long, please refresh the page</p>
        </div>
      </div>
    )
  }

  // Calculate stats
  const availableRooms = rooms.filter(r => r.is_available).length
  const occupiedRooms = rooms.length - availableRooms
  const pendingPayments = payments.filter(payment => payment.status === 'pending').length

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary-700">Admin Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <div className="flex items-start gap-2">
            <span className="text-yellow-500">⚠️</span>
            <div>
              <div className="font-medium">Warning:</div>
              <div className="text-sm">{error}</div>
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

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent hover:text-primary-600'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === 'rooms' ? 'border-primary-500 text-primary-600' : 'border-transparent hover:text-primary-600'}`}
        >
          Rooms Management ({rooms.length})
        </button>
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === 'tenants' ? 'border-primary-500 text-primary-600' : 'border-transparent hover:text-primary-600'}`}
        >
          Tenants Management
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === 'payments' ? 'border-primary-500 text-primary-600' : 'border-transparent hover:text-primary-600'}`}
        >
          Payments ({payments.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="text-center text-gray-500 py-4">No payments yet</div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Room Status</h3>
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
                <div className="text-center text-gray-500 py-4">No rooms yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rooms' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Rooms Management ({rooms.length})</h3>
            <button 
              onClick={() => setShowAddRoom(true)}
              className="btn-primary"
            >
              Add Room
            </button>
          </div>
          <RoomList 
            rooms={rooms} 
            adminMode 
            onToggle={toggleRoom}
            onEdit={handleEditRoom}
            onDelete={() => alert('Delete functionality not implemented yet')}
          />
        </div>
      )}

      {activeTab === 'tenants' && (
        <TenantManagement rooms={rooms} />
      )}

      {activeTab === 'payments' && (
        <div>
          <h3 className="font-semibold mb-4 text-lg">Payments Management ({payments.length})</h3>
          <div className="space-y-3">
            {payments.map(payment => (
              <div key={payment.id} className="card border-l-4 border-l-primary-500">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{payment.tenant_name}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>📱 {payment.phone}</div>
                      <div>🗓️ Month: {payment.month}</div>
                      {payment.room_number && (
                        <div>🏠 Room: {payment.room_number}</div>
                      )}
                      <div>📅 Submitted: {new Date(payment.created_at).toLocaleDateString('id-ID')}</div>
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
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => verifyPayment(payment, 'rejected')} 
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
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
              <div className="card text-center text-gray-500">
                No payments submitted yet.
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
