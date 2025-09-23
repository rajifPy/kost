// pages/admin/dashboard.js - FIXED VERSION with safe property access
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
  const [verifyLoading, setVerifyLoading] = useState(null) // Track which payment is being verified
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
      console.log('🏠 Fetching rooms...')
      const roomsPromise = supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('💳 Fetching payments...')
      const paymentsPromise = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })

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

    setTimeout(() => {
      setLoading(false)
      console.log('✅ Loading cleared')
    }, 300)
  }

  // ✅ FIXED: Safe property access with null checks
  async function verifyPayment(payment, action) {
    // ✅ Defensive programming - check if payment exists and has required properties
    if (!payment || !payment.id) {
      alert('❌ Error: Invalid payment data')
      return
    }

    // ✅ Safe property access with fallbacks
    const paymentId = payment.id
    const paymentName = payment.tenant_name || 'Unknown Tenant'
    const paymentPhone = payment.phone || 'No phone'
    const paymentMonth = payment.month || 'Unknown month'
    
    console.log('🔍 Verifying payment:', {
      id: paymentId,
      name: paymentName,
      phone: paymentPhone,
      month: paymentMonth,
      action: action
    })
    
    if (!confirm(`${action === 'success' ? 'Accept' : 'Reject'} payment from ${paymentName}?`)) {
      return
    }

    // Set loading state for this specific payment
    setVerifyLoading(paymentId)

    try {
      console.log('📤 Sending verify request...')
      
      const requestBody = {
        id: paymentId,
        action: action,
        admin_notes: action === 'rejected' ? 'Payment rejected by admin' : 'Payment approved by admin'
      }
      
      console.log('📋 Request body:', requestBody)
      
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(requestBody)
      })
      
      const data = await res.json()
      console.log('📥 API Response:', data)
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`)
      }
      
      // ✅ Show success message with safe property access
      const successMessage = data.message || `✅ Payment ${action}ed successfully!`
      
      // ✅ Additional info if available
      let additionalInfo = ''
      if (data.notifications) {
        const { whatsapp, email, successful, attempted } = data.notifications
        additionalInfo += `\n\n📊 Notifications: ${successful}/${attempted} sent`
        
        if (whatsapp?.success && paymentPhone) {
          additionalInfo += `\n📱 WhatsApp: Sent to ${paymentPhone}`
        } else if (whatsapp?.error && paymentPhone) {
          additionalInfo += `\n📱 WhatsApp: Failed - ${whatsapp.error}`
        }
        
        if (email?.success && data.notifications.tenant_email) {
          additionalInfo += `\n📧 Email: Sent to ${data.notifications.tenant_email}`
        } else if (email?.error && data.notifications.tenant_email) {
          additionalInfo += `\n📧 Email: Failed - ${email.error}`
        }
      }
      
      alert(successMessage + additionalInfo)
      
      // Refresh data to show updated status
      fetchData()
      
    } catch (error) {
      console.error('❌ Verify payment error:', error)
      
      // ✅ User-friendly error messages
      let errorMessage = '❌ Error verifying payment:\n'
      
      if (error.message.includes('fetch')) {
        errorMessage += 'Network connection error. Please check your internet connection.'
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Request timeout. The server is taking too long to respond.'
      } else if (error.message.includes('500')) {
        errorMessage += 'Server error. Please try again or contact technical support.'
      } else if (error.message.includes('404')) {
        errorMessage += 'Payment not found. It may have been already processed.'
      } else {
        errorMessage += error.message
      }
      
      errorMessage += `\n\n💡 Payment Details:\n• ID: ${paymentId}\n• Name: ${paymentName}\n• Action: ${action}`
      
      alert(errorMessage)
    } finally {
      // Clear loading state
      setVerifyLoading(null)
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

  // Calculate stats with safe property access
  const availableRooms = rooms.filter(r => r?.is_available === true).length
  const occupiedRooms = rooms.length - availableRooms
  const pendingPayments = payments.filter(p => p?.status === 'pending').length

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
                <div key={room?.id || Math.random()} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{room?.title || `Room ${room?.number || 'Unknown'}`}</div>
                    <div className="text-sm text-gray-600">Rp {room?.price?.toLocaleString('id-ID') || '0'}</div>
                  </div>
                  <span className={room?.is_available ? 'pill-available' : 'pill-full'}>
                    {room?.is_available ? 'Available' : 'Occupied'}
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
                <div key={payment?.id || Math.random()} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{payment?.tenant_name || 'Unknown'}</div>
                    <div className="text-sm text-gray-600">{payment?.month || 'Unknown month'}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    payment?.status === 'success' ? 'bg-green-100 text-green-800' :
                    payment?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {payment?.status || 'pending'}
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
            {payments.map(payment => {
              // ✅ Safe property access with fallbacks
              const paymentId = payment?.id
              const tenantName = payment?.tenant_name || 'Unknown Tenant'
              const tenantPhone = payment?.phone || 'No phone provided'
              const tenantMonth = payment?.month || 'Unknown month'
              const roomNumber = payment?.room_number
              const createdAt = payment?.created_at
              const message = payment?.message
              const receiptUrl = payment?.receipt_url
              const status = payment?.status || 'pending'
              const isVerifying = verifyLoading === paymentId
              
              return (
                <div key={paymentId || Math.random()} className="card border-l-4 border-l-primary-500">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{tenantName}</div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>📱 {tenantPhone}</div>
                        <div>🗓️ {tenantMonth}</div>
                        {roomNumber && <div>🏠 Room: {roomNumber}</div>}
                        {createdAt && <div>📅 {new Date(createdAt).toLocaleDateString('id-ID')}</div>}
                        {message && <div>💬 {message}</div>}
                        {receiptUrl && (
                          <div>
                            <a 
                              target="_blank" 
                              rel="noreferrer" 
                              href={receiptUrl} 
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
                        status === 'success' ? 'bg-green-100 text-green-800' :
                        status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status}
                      </span>
                      {status === 'pending' && (
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => verifyPayment(payment, 'success')} 
                            disabled={isVerifying}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              isVerifying 
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {isVerifying ? 'Processing...' : 'Accept'}
                          </button>
                          <button 
                            onClick={() => verifyPayment(payment, 'rejected')} 
                            disabled={isVerifying}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              isVerifying 
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {isVerifying ? 'Processing...' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
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
