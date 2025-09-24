// components/RoomManagement.js
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import RoomList from './RoomList'

export default function RoomManagement({ rooms, onRefresh }) {
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [newRoom, setNewRoom] = useState({
    number: '',
    title: '',
    description: '',
    price: '',
    is_available: true,
    images: []
  })
  const [imageUrls, setImageUrls] = useState('')

  // Reset form
  function resetForm() {
    setNewRoom({
      number: '', title: '', description: '', price: '', is_available: true, images: []
    })
    setImageUrls('')
  }

  // Handle Add Room
  async function handleAddRoom(e) {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate
      if (!newRoom.number.trim()) {
        alert('Room number is required')
        return
      }

      // Check if room number already exists
      const { data: existingRoom } = await supabase
        .from('rooms')
        .select('id')
        .eq('number', newRoom.number.trim())
        .single()

      if (existingRoom) {
        alert('Room number already exists!')
        return
      }

      // Process image URLs
      const processedImages = imageUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url && url.startsWith('http'))

      // Insert room
      const { error } = await supabase.from('rooms').insert([{
        number: newRoom.number.trim(),
        title: newRoom.title.trim() || `Room ${newRoom.number}`,
        description: newRoom.description.trim(),
        price: parseInt(newRoom.price) || 0,
        is_available: newRoom.is_available,
        images: processedImages
      }])

      if (error) throw error

      alert('Room added successfully!')
      resetForm()
      setShowAddRoom(false)
      if (onRefresh) onRefresh()
      
    } catch (error) {
      console.error('Add room error:', error)
      alert('Error adding room: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Edit Room
  async function handleEditRoom(e) {
    e.preventDefault()
    setLoading(true)

    try {
      if (!editingRoom.number.trim()) {
        alert('Room number is required')
        return
      }

      // Process image URLs
      const processedImages = imageUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url && url.startsWith('http'))

      const { error } = await supabase
        .from('rooms')
        .update({
          number: editingRoom.number.trim(),
          title: editingRoom.title.trim() || `Room ${editingRoom.number}`,
          description: editingRoom.description.trim(),
          price: parseInt(editingRoom.price) || 0,
          is_available: editingRoom.is_available,
          images: processedImages
        })
        .eq('id', editingRoom.id)

      if (error) throw error

      alert('Room updated successfully!')
      setEditingRoom(null)
      setImageUrls('')
      if (onRefresh) onRefresh()
      
    } catch (error) {
      console.error('Edit room error:', error)
      alert('Error updating room: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Delete Room
  async function handleDeleteRoom(room) {
    if (!confirm(`Delete room ${room.number}? This action cannot be undone.`)) return

    try {
      setLoading(true)
      const { error } = await supabase.from('rooms').delete().eq('id', room.id)
      if (error) throw error

      alert('Room deleted successfully!')
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Delete room error:', error)
      alert('Error deleting room: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Toggle Availability
  async function handleToggleRoom(room) {
    try {
      const newStatus = !room.is_available
      const { error } = await supabase
        .from('rooms')
        .update({ is_available: newStatus })
        .eq('id', room.id)

      if (error) throw error
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Toggle room error:', error)
      alert('Error updating room status: ' + error.message)
    }
  }

  // Handle Edit Click
  function handleEditClick(room) {
    setEditingRoom({
      ...room,
      price: room.price?.toString() || ''
    })
    setImageUrls(room.images?.join('\n') || '')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">
          Rooms Management ({rooms?.length || 0})
        </h3>
        <button 
          onClick={() => setShowAddRoom(true)}
          className="btn-primary"
          disabled={loading}
        >
          Add Room
        </button>
      </div>

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h4 className="font-semibold mb-4 text-lg">Add New Room</h4>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Room Number * (e.g., KM1)"
                  required
                  value={newRoom.number}
                  onChange={e => setNewRoom({...newRoom, number: e.target.value})}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                <input
                  placeholder="Room Title"
                  value={newRoom.title}
                  onChange={e => setNewRoom({...newRoom, title: e.target.value})}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <textarea
                placeholder="Room Description"
                value={newRoom.description}
                onChange={e => setNewRoom({...newRoom, description: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                rows="3"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Monthly Price (Rp)"
                  value={newRoom.price}
                  onChange={e => setNewRoom({...newRoom, price: e.target.value})}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRoom.is_available}
                    onChange={e => setNewRoom({...newRoom, is_available: e.target.checked})}
                    className="rounded"
                  />
                  Available for rent
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Image URLs (one per line):
                </label>
                <textarea
                  placeholder={`https://example.com/image1.jpg
https://example.com/image2.jpg
https://example.com/image3.jpg`}
                  value={imageUrls}
                  onChange={e => setImageUrls(e.target.value)}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                  rows="4"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Enter complete HTTP/HTTPS URLs. Empty lines will be ignored.
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Adding...' : 'Add Room'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    resetForm()
                    setShowAddRoom(false)
                  }}
                  className="px-4 py-2 border rounded-lg flex-1 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h4 className="font-semibold mb-4 text-lg">Edit Room</h4>
            <form onSubmit={handleEditRoom} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Room Number *"
                  required
                  value={editingRoom.number}
                  onChange={e => setEditingRoom({...editingRoom, number: e.target.value})}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                <input
                  placeholder="Room Title"
                  value={editingRoom.title || ''}
                  onChange={e => setEditingRoom({...editingRoom, title: e.target.value})}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <textarea
                placeholder="Room Description"
                value={editingRoom.description || ''}
                onChange={e => setEditingRoom({...editingRoom, description: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                rows="3"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Monthly Price (Rp)"
                  value={editingRoom.price}
                  onChange={e => setEditingRoom({...editingRoom, price: e.target.value})}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingRoom.is_available}
                    onChange={e => setEditingRoom({...editingRoom, is_available: e.target.checked})}
                    className="rounded"
                  />
                  Available for rent
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Image URLs (one per line):
                </label>
                <textarea
                  placeholder={`https://example.com/image1.jpg
https://example.com/image2.jpg
https://example.com/image3.jpg`}
                  value={imageUrls}
                  onChange={e => setImageUrls(e.target.value)}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                  rows="4"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Current images: {editingRoom.images?.length || 0}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Updating...' : 'Update Room'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingRoom(null)
                    setImageUrls('')
                  }}
                  className="px-4 py-2 border rounded-lg flex-1 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rooms List */}
      <div className="mt-6">
        {rooms && rooms.length > 0 ? (
          <RoomList 
            rooms={rooms} 
            adminMode={true}
            onToggle={handleToggleRoom}
            onEdit={handleEditClick}
            onDelete={handleDeleteRoom}
          />
        ) : (
          <div className="card text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">🏠</div>
            <p className="text-gray-600">No rooms available yet.</p>
            <button 
              onClick={() => setShowAddRoom(true)}
              className="btn-primary mt-4"
            >
              Add First Room
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
