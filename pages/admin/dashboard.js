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
    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (roomsError) {
        console.error('Rooms fetch error:', roomsError)
        throw roomsError
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          tenant:tenant_id (
            name, 
            phone, 
            room_number
          )
        `)
        .order('created_at', { ascending: false })
      
      if (paymentsError) {
        console.error('Payments fetch error:', paymentsError)
        setPayments([])
      } else {
        setPayments(paymentsData || [])
      }

      setRooms(roomsData || [])
      console.log('Data fetched successfully:', {
        rooms: roomsData?.length || 0,
        payments: paymentsData?.length || 0
      })
    } catch (error) {
      console.error('Fetch error:', error)
      alert('Error fetching data: ' + error.message)
      setRooms([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  async function uploadImages(files) {
    if (!files || files.length === 0) return []
    
    setImageUploading(true)
    const uploadedUrls = []
    
    try {
      for (let file of files) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Max 5MB allowed.`)
          continue
        }

        if (!file.type.startsWith('image/')) {
          alert(`File ${file.name} is not an image.`)
          continue
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `room_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        
        console.log('Uploading image:', fileName)
        const { data, error } = await supabase.storage
          .from('room-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (error) {
          console.error('Upload error for', fileName, error)
          if (error.message.includes('not found') || error.message.includes('bucket')) {
            alert('Storage bucket "room-images" not found. Please create it in Supabase Dashboard.')
            break
          }
          throw error
        }
        
        const { data: urlData } = supabase.storage
          .from('room-images')
          .getPublicUrl(data.path)
        
        uploadedUrls.push(urlData.publicUrl)
        console.log('Image uploaded successfully:', urlData.publicUrl)
      }
      
      return uploadedUrls
    } catch (error) {
      console.error('Image upload error:', error)
      alert('Error uploading images: ' + error.message)
      return []
    } finally {
      setImageUploading(false)
    }
  }

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

  async function handleAddRoom(e) {
    e.preventDefault()
    
    if (!newRoom.number.trim()) {
      alert('Room number is required')
      return
    }
    if (!newRoom.title.trim()) {
      alert('Room title is required')
      return
    }
    if (!newRoom.price || isNaN(parseInt(newRoom.price))) {
      alert('Valid price is required')
      return
    }

    try {
      setImageUploading(true)
      
      const imageUrls = await uploadImages(roomImages)
      
      console.log('Adding room with data:', {
        number: newRoom.number,
        title: newRoom.title,
        price: parseInt(newRoom.price),
        images: imageUrls.length
      })

      const { error } = await supabase.from('rooms').insert([{
        number: newRoom.number.trim(),
        title: newRoom.title.trim(),
        description: newRoom.description.trim() || null,
        price: parseInt(newRoom.price),
        is_available: newRoom.is_available,
        images: imageUrls
      }])
      
      if (error) {
        console.error('Insert room error:', error)
        throw error
      }
      
      setNewRoom({ number: '', title: '', description: '', price: '', is_available: true })
      setRoomImages([])
      setShowAddRoom(false)
      await fetchData()
      alert('Room added successfully!')
    } catch (error) {
      console.error('Add room error:', error)
      alert('Error adding room: ' + error.message)
    } finally {
      setImageUploading(false)
    }
  }

  async function handleUpdateRoom(e) {
    e.preventDefault()
    
    if (!editingRoom.number.trim()) {
      alert('Room number is required')
      return
    }
    if (!editingRoom.title.trim()) {
      alert('Room title is required')
      return
    }
    if (!editingRoom.price || isNaN(parseInt(editingRoom.price))) {
      alert('Valid price is required')
      return
    }

    try {
      setImageUploading(true)
      
      const newImageUrls = await uploadImages(editRoomImages)
      const allImages = [...(editingRoom.images || []), ...newImageUrls]
      
      console.log('Updating room with data:', {
        id: editingRoom.id,
        number: editingRoom.number,
        title: editingRoom.title,
        price: parseInt(editingRoom.price),
        images: allImages.length
      })

      const { error } = await supabase
        .from('rooms')
        .update({
          number: editingRoom.number.trim(),
          title: editingRoom.title.trim(),
          description: editingRoom.description.trim() || null,
          price: parseInt(editingRoom.price),
          is_available: editingRoom.is_available,
          images: allImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRoom.id)
      
      if (error) {
        console.error('Update room error:', error)
        throw error
      }
      
      setEditingRoom(null)
      setEditRoomImages([])
      await fetchData()
      alert('Room updated successfully!')
    } catch (error) {
      console.error('Update room error:', error)
      alert('Error updating room: ' + error.message)
    } finally {
      setImageUploading(false)
    }
  }

  async function handleDeleteRoom(room) {
    if (!confirm(`Delete room ${room.number}?\n\nThis action cannot be undone.`)) return
    
    try {
      console.log('Deleting room:', room.number)
      
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('room_id', room.id)
        .eq('is_active', true)

      if (tenantError) {
        console.error('Error checking tenants:', tenantError)
      } else if (tenants && tenants.length > 0) {
        const tenantNames = tenants.map(t => t.name).join(', ')
        alert(`Cannot delete room ${room.number}. Active tenants: ${tenantNames}`)
        return
      }

      const { error } = await supabase.from('rooms').delete().eq('id', room.id)
      if (error) {
        console.error('Delete room error:', error)
        throw error
      }
      
      await fetchData()
      alert('Room deleted successfully!')
    } catch (error) {
      console.error('Delete room error:', error)
      alert('Error deleting room: ' + error.message)
    }
  }

  async function verifyPayment(payment, action) {
    if (!confirm(`${action === 'success' ? 'Accept' : 'Reject'} payment from ${payment.tenant_name || payment.tenants?.name}?`)) {
      return
    }

    try {
      console.log('Verifying payment:', payment.id, action)
      
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payment.id, action })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify payment')
      }
      
      console.log('Payment verified successfully:', data)
      await fetchData()
      
      const message = data.whatsapp_notification?.success 
        ? `Payment ${action}ed successfully! WhatsApp notification sent.`
        : `Payment ${action}ed successfully! (WhatsApp notification failed: ${data.whatsapp_notification?.error || 'Unknown error'})`
      
      alert(message)
    } catch (error) {
      console.error('Verify payment error:', error)
      alert('Error updating payment: ' + error.message)
    }
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

  function handleImageSelect(e, isEdit = false) {
    const files = Array.from(e.target.files)
    console.log('Images selected:', files.length, isEdit ? '(for editing)' : '(for new room)')
    
    if (isEdit) {
      setEditRoomImages(files)
    } else {
      setRoomImages(files)
    }
  }

  function removeImage(imageUrl, isEdit = false) {
    console.log('Removing image:', imageUrl)
    if (isEdit && editingRoom) {
      setEditingRoom({
        ...editingRoom,
        images: editingRoom.images.filter(img => img !== imageUrl)
      })
    }
  }

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
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p>Loading admin dashboard...</p>
      </div>
    )
  }

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
          Rooms Management
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
          Payments
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Recent Payments</h3>
            <div className="space-y-2">
              {payments.slice(0, 5).map(payment => (
                <div key={payment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{payment.tenants?.name || payment.tenant_name}</div>
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
            onDelete={handleDeleteRoom}
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
                    <div className="font-semibold text-lg">{payment.tenants?.name || payment.tenant_name}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>📱 {payment.tenants?.phone || payment.phone}</div>
                      <div>🗓️ Month: {payment.month}</div>
                      {(payment.tenants?.room_number || payment.room_number) && (
                        <div>🏠 Room: {payment.tenants?.room_number || payment.room_number}</div>
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

      {showAddRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">Add New Room</h3>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <input
                placeholder="Room Number *"
                required
                value={newRoom.number}
                onChange={e => setNewRoom({...newRoom, number: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
              />
              <input
                placeholder="Title *"
                required
                value={newRoom.title}
                onChange={e => setNewRoom({...newRoom, title: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
              />
              <textarea
                placeholder="Description"
                value={newRoom.description}
                onChange={e => setNewRoom({...newRoom, description: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                rows="3"
              />
              <input
                type="number"
                placeholder="Price (Rp) *"
                required
                min="0"
                value={newRoom.price}
                onChange={e => setNewRoom({...newRoom, price: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
              />
              
              <div>
                <label className="block text-sm font-medium mb-2">Room Images:</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => handleImageSelect(e, false)}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Select multiple images (JPG, PNG). Max 5MB each.
                </div>
                
                {roomImages.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium mb-2">Selected Images ({roomImages.length}):</div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from(roomImages).map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-16 object-cover rounded border"
                          />
                          <div className="text-xs text-center truncate mt-1">{file.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newRoom.is_available}
                  onChange={e => setNewRoom({...newRoom, is_available: e.target.checked})}
                />
                Available
              </label>
              
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={imageUploading}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {imageUploading ? 'Uploading...' : 'Add Room'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddRoom(false)
                    setRoomImages([])
                    setNewRoom({ number: '', title: '', description: '', price: '', is_available: true })
                  }}
                  className="px-4 py-2 border rounded flex-1 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">Edit Room</h3>
            <form onSubmit={handleUpdateRoom} className="space-y-4">
              <input
                placeholder="Room Number *"
                required
                value={editingRoom.number}
                onChange={e => setEditingRoom({...editingRoom, number: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
              />
              <input
                placeholder="Title *"
                required
                value={editingRoom.title}
                onChange={e => setEditingRoom({...editingRoom, title: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
              />
              <textarea
                placeholder="Description"
                value={editingRoom.description || ''}
                onChange={e => setEditingRoom({...editingRoom, description: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                rows="3"
              />
              <input
                type="number"
                placeholder="Price (Rp) *"
                required
                min="0"
                value={editingRoom.price}
                onChange={e => setEditingRoom({...editingRoom, price: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
              />
              
              {editingRoom.images && editingRoom.images.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Current Images:</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {editingRoom.images.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <img
                          src={imageUrl}
                          alt={`Room ${index + 1}`}
                          className="w-full h-16 object-cover rounded border"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextElementSibling.style.display = 'flex'
                          }}
                        />
                        <div className="w-full h-16 bg-gray-100 rounded border items-center justify-center text-xs text-gray-500 hidden">
                          Image not found
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(imageUrl, true)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2">Add More Images:</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => handleImageSelect(e, true)}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                
                {editRoomImages.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium mb-2">New Images ({editRoomImages.length}):</div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from(editRoomImages).map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`New ${index + 1}`}
                            className="w-full h-16 object-cover rounded border"
                          />
                          <div className="text-xs text-center truncate mt-1">{file.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingRoom.is_available}
                  onChange={e => setEditingRoom({...editingRoom, is_available: e.target.checked})}
                />
                Available
              </label>
              
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={imageUploading}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {imageUploading ? 'Updating...' : 'Update Room'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingRoom(null)
                    setEditRoomImages([])
                  }}
                  className="px-4 py-2 border rounded flex-1 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export async function getServerSideProps() {
  return { props: {} }
}
