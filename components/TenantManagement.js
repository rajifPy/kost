import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function TenantManagement({ rooms = [] }) {
  const [tenants, setTenants] = useState([])
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [newTenant, setNewTenant] = useState({
    name: '',
    phone: '',
    email: '',
    room_id: '',
    room_number: '',
    check_in_date: '',
    monthly_rent: '',
    deposit_amount: '',
    notes: '',
    is_active: true
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          rooms (
            number,
            title,
            price
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTenants(data || [])
    } catch (error) {
      console.error('Fetch tenants error:', error)
      alert('Error fetching tenants: ' + error.message)
    }
  }

  async function handleAddTenant(e) {
    e.preventDefault()
    setLoading(true)

    try {
      // Get room info
      const selectedRoom = rooms.find(r => r.id === newTenant.room_id)
      
      const { error } = await supabase.from('tenants').insert([{
        name: newTenant.name,
        phone: newTenant.phone,
        email: newTenant.email || null,
        room_id: newTenant.room_id || null,
        room_number: selectedRoom?.number || newTenant.room_number,
        check_in_date: newTenant.check_in_date || null,
        monthly_rent: parseInt(newTenant.monthly_rent) || 0,
        deposit_amount: parseInt(newTenant.deposit_amount) || 0,
        notes: newTenant.notes || '',
        is_active: newTenant.is_active
      }])
      
      if (error) throw error
      
      // If assigned to room, update room availability
      if (newTenant.room_id && newTenant.is_active) {
        await supabase
          .from('rooms')
          .update({ is_available: false })
          .eq('id', newTenant.room_id)
      }
      
      setNewTenant({
        name: '', phone: '', email: '', room_id: '', room_number: '',
        check_in_date: '', monthly_rent: '', deposit_amount: '', notes: '', is_active: true
      })
      setShowAddTenant(false)
      fetchTenants()
      alert('Tenant added successfully!')
    } catch (error) {
      console.error('Add tenant error:', error)
      alert('Error adding tenant: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateTenant(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const selectedRoom = rooms.find(r => r.id === editingTenant.room_id)
      const oldTenant = tenants.find(t => t.id === editingTenant.id)
      
      const { error } = await supabase
        .from('tenants')
        .update({
          name: editingTenant.name,
          phone: editingTenant.phone,
          email: editingTenant.email || null,
          room_id: editingTenant.room_id || null,
          room_number: selectedRoom?.number || editingTenant.room_number,
          check_in_date: editingTenant.check_in_date || null,
          monthly_rent: parseInt(editingTenant.monthly_rent) || 0,
          deposit_amount: parseInt(editingTenant.deposit_amount) || 0,
          notes: editingTenant.notes || '',
          is_active: editingTenant.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTenant.id)
      
      if (error) throw error

      // Update room availability based on tenant status
      if (oldTenant.room_id && oldTenant.room_id !== editingTenant.room_id) {
        // Free up old room
        await supabase
          .from('rooms')
          .update({ is_available: true })
          .eq('id', oldTenant.room_id)
      }

      if (editingTenant.room_id && editingTenant.is_active) {
        // Occupy new room
        await supabase
          .from('rooms')
          .update({ is_available: false })
          .eq('id', editingTenant.room_id)
      } else if (editingTenant.room_id && !editingTenant.is_active) {
        // Free up room if tenant inactive
        await supabase
          .from('rooms')
          .update({ is_available: true })
          .eq('id', editingTenant.room_id)
      }
      
      setEditingTenant(null)
      fetchTenants()
      alert('Tenant updated successfully!')
    } catch (error) {
      console.error('Update tenant error:', error)
      alert('Error updating tenant: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteTenant(tenant) {
    if (!confirm(`Delete tenant ${tenant.name}?`)) return
    
    try {
      const { error } = await supabase.from('tenants').delete().eq('id', tenant.id)
      if (error) throw error

      // Free up room if tenant was occupying one
      if (tenant.room_id) {
        await supabase
          .from('rooms')
          .update({ is_available: true })
          .eq('id', tenant.room_id)
      }

      fetchTenants()
      alert('Tenant deleted successfully!')
    } catch (error) {
      console.error('Delete tenant error:', error)
      alert('Error deleting tenant: ' + error.message)
    }
  }

  async function handleCheckOut(tenant) {
    if (!confirm(`Check out ${tenant.name}? This will free up their room.`)) return
    
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant.id)
      
      if (error) throw error

      // Free up room
      if (tenant.room_id) {
        await supabase
          .from('rooms')
          .update({ is_available: true })
          .eq('id', tenant.room_id)
      }

      fetchTenants()
      alert('Tenant checked out successfully!')
    } catch (error) {
      console.error('Check out error:', error)
      alert('Error checking out tenant: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Tenant Management ({tenants.length})</h3>
        <button 
          onClick={() => setShowAddTenant(true)}
          className="btn-primary"
        >
          Add Tenant
        </button>
      </div>

      {/* Add Tenant Modal */}
      {showAddTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
            <h4 className="font-semibold mb-4">Add New Tenant</h4>
            <form onSubmit={handleAddTenant} className="space-y-3">
              <input
                placeholder="Tenant Name *"
                required
                value={newTenant.name}
                onChange={e => setNewTenant({...newTenant, name: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                placeholder="Phone Number *"
                required
                value={newTenant.phone}
                onChange={e => setNewTenant({...newTenant, phone: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                placeholder="Email (optional)"
                type="email"
                value={newTenant.email}
                onChange={e => setNewTenant({...newTenant, email: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <select
                value={newTenant.room_id}
                onChange={e => setNewTenant({...newTenant, room_id: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">Select Room (optional)</option>
                {rooms.filter(r => r.is_available).map(room => (
                  <option key={room.id} value={room.id}>
                    {room.number} - {room.title} (Rp {room.price?.toLocaleString()})
                  </option>
                ))}
              </select>
              <input
                type="date"
                placeholder="Check-in Date"
                value={newTenant.check_in_date}
                onChange={e => setNewTenant({...newTenant, check_in_date: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                type="number"
                placeholder="Monthly Rent"
                value={newTenant.monthly_rent}
                onChange={e => setNewTenant({...newTenant, monthly_rent: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                type="number"
                placeholder="Deposit Amount"
                value={newTenant.deposit_amount}
                onChange={e => setNewTenant({...newTenant, deposit_amount: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <textarea
                placeholder="Notes (optional)"
                value={newTenant.notes}
                onChange={e => setNewTenant({...newTenant, notes: e.target.value})}
                className="w-full border px-3 py-2 rounded"
                rows="2"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newTenant.is_active}
                  onChange={e => setNewTenant({...newTenant, is_active: e.target.checked})}
                />
                Active Tenant
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Adding...' : 'Add Tenant'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddTenant(false)}
                  className="px-4 py-2 border rounded flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
            <h4 className="font-semibold mb-4">Edit Tenant</h4>
            <form onSubmit={handleUpdateTenant} className="space-y-3">
              <input
                placeholder="Tenant Name *"
                required
                value={editingTenant.name}
                onChange={e => setEditingTenant({...editingTenant, name: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                placeholder="Phone Number *"
                required
                value={editingTenant.phone}
                onChange={e => setEditingTenant({...editingTenant, phone: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                placeholder="Email (optional)"
                type="email"
                value={editingTenant.email || ''}
                onChange={e => setEditingTenant({...editingTenant, email: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <select
                value={editingTenant.room_id || ''}
                onChange={e => setEditingTenant({...editingTenant, room_id: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">No Room Assigned</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.number} - {room.title} (Rp {room.price?.toLocaleString()})
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={editingTenant.check_in_date || ''}
                onChange={e => setEditingTenant({...editingTenant, check_in_date: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                type="number"
                placeholder="Monthly Rent"
                value={editingTenant.monthly_rent || ''}
                onChange={e => setEditingTenant({...editingTenant, monthly_rent: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                type="number"
                placeholder="Deposit Amount"
                value={editingTenant.deposit_amount || ''}
                onChange={e => setEditingTenant({...editingTenant, deposit_amount: e.target.value})}
                className="w-full border px-3 py-2 rounded"
              />
              <textarea
                placeholder="Notes"
                value={editingTenant.notes || ''}
                onChange={e => setEditingTenant({...editingTenant, notes: e.target.value})}
                className="w-full border px-3 py-2 rounded"
                rows="2"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingTenant.is_active}
                  onChange={e => setEditingTenant({...editingTenant, is_active: e.target.checked})}
                />
                Active Tenant
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Updating...' : 'Update'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 border rounded flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenants List */}
      <div className="space-y-3">
        {tenants.map(tenant => (
          <div key={tenant.id} className="card border-l-4 border-l-primary-500">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-lg">{tenant.name}</span>
                  <span className={tenant.is_active ? 'pill-available' : 'pill-full'}>
                    {tenant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>📱 {tenant.phone}</div>
                  {tenant.email && <div>📧 {tenant.email}</div>}
                  {tenant.rooms?.number && (
                    <div>🏠 Room {tenant.rooms.number} - {tenant.rooms.title}</div>
                  )}
                  {tenant.monthly_rent && (
                    <div>💰 Rent: Rp {tenant.monthly_rent.toLocaleString()}/month</div>
                  )}
                  {tenant.check_in_date && (
                    <div>📅 Check-in: {new Date(tenant.check_in_date).toLocaleDateString()}</div>
                  )}
                  {tenant.notes && <div>📝 {tenant.notes}</div>}
                </div>
              </div>
              <div className="flex flex-col gap-1 ml-4">
                <button 
                  onClick={() => setEditingTenant({...tenant, 
                    monthly_rent: tenant.monthly_rent?.toString() || '',
                    deposit_amount: tenant.deposit_amount?.toString() || ''
                  })}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                >
                  Edit
                </button>
                {tenant.is_active && (
                  <button 
                    onClick={() => handleCheckOut(tenant)}
                    className="px-2 py-1 bg-yellow-600 text-white rounded text-xs"
                  >
                    Check Out
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteTenant(tenant)}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {tenants.length === 0 && (
          <div className="card text-center text-gray-500">
            No tenants registered yet. Click "Add Tenant" to get started.
          </div>
        )}
      </div>
    </div>
  )
}
