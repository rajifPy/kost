// components/GalleryManagement.js - UPDATED with Local File Upload
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function GalleryManagement() {
  const [galleryItems, setGalleryItems] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    image_url: '',
    sort_order: 0,
    is_active: true
  })

  useEffect(() => {
    fetchGalleryItems()
  }, [])

  async function fetchGalleryItems() {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('sort_order', { ascending: true })
      
      if (error) throw error
      setGalleryItems(data || [])
    } catch (error) {
      console.error('Fetch gallery error:', error)
      alert('Error fetching gallery: ' + error.message)
    }
  }

  // Upload file to Supabase Storage
  async function uploadImageFile(file) {
    if (!file) return null
    
    setUploadLoading(true)
    
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `gallery_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      
      console.log('📤 Uploading gallery image:', fileName)
      
      // Upload to gallery bucket (create if doesn't exist)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(uploadData.path)
      
      console.log('✅ Image uploaded successfully:', urlData.publicUrl)
      return urlData.publicUrl
      
    } catch (error) {
      console.error('💥 Upload error:', error)
      throw error
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleAddItem(e) {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!newItem.title.trim()) {
        alert('Title is required')
        return
      }
      
      let imageUrl = newItem.image_url.trim()
      
      // If file is selected, upload it first
      if (selectedFile) {
        console.log('📤 Uploading selected file...')
        imageUrl = await uploadImageFile(selectedFile)
        
        if (!imageUrl) {
          throw new Error('Failed to upload image')
        }
      }
      
      // Validate we have an image URL (either uploaded or entered manually)
      if (!imageUrl) {
        alert('Please either upload an image file or enter an image URL')
        return
      }
      
      if (!imageUrl.startsWith('http')) {
        alert('Please enter a valid HTTP/HTTPS URL or upload a file')
        return
      }

      // Set sort_order to highest + 1 if not specified
      const maxOrder = Math.max(...galleryItems.map(item => item.sort_order || 0), 0)
      const sortOrder = newItem.sort_order || (maxOrder + 1)

      const { error } = await supabase.from('gallery').insert([{
        title: newItem.title.trim(),
        description: newItem.description.trim(),
        image_url: imageUrl,
        sort_order: sortOrder,
        is_active: newItem.is_active
      }])

      if (error) throw error

      alert('Gallery item added successfully!')
      setNewItem({
        title: '', description: '', image_url: '', sort_order: 0, is_active: true
      })
      setSelectedFile(null)
      setShowAddModal(false)
      fetchGalleryItems()
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''
      
    } catch (error) {
      console.error('Add gallery item error:', error)
      alert('Error adding gallery item: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateItem(e) {
    e.preventDefault()
    setLoading(true)

    try {
      if (!editingItem.title.trim()) {
        alert('Title is required')
        return
      }
      
      let imageUrl = editingItem.image_url.trim()
      
      // If new file is selected, upload it
      if (selectedFile) {
        console.log('📤 Uploading new file for edit...')
        imageUrl = await uploadImageFile(selectedFile)
        
        if (!imageUrl) {
          throw new Error('Failed to upload new image')
        }
      }
      
      if (!imageUrl) {
        alert('Image URL is required')
        return
      }
      if (!imageUrl.startsWith('http')) {
        alert('Please enter a valid HTTP/HTTPS URL')
        return
      }

      const { error } = await supabase
        .from('gallery')
        .update({
          title: editingItem.title.trim(),
          description: editingItem.description.trim(),
          image_url: imageUrl,
          sort_order: editingItem.sort_order || 0,
          is_active: editingItem.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)

      if (error) throw error

      alert('Gallery item updated successfully!')
      setEditingItem(null)
      setSelectedFile(null)
      fetchGalleryItems()
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''
      
    } catch (error) {
      console.error('Update gallery item error:', error)
      alert('Error updating gallery item: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteItem(item) {
    if (!confirm(`Delete "${item.title}"? This action cannot be undone.`)) return

    try {
      setLoading(true)
      const { error } = await supabase.from('gallery').delete().eq('id', item.id)
      if (error) throw error

      // Note: We're not deleting the actual file from storage as it might be referenced elsewhere
      // You can implement file cleanup later if needed

      alert('Gallery item deleted successfully!')
      fetchGalleryItems()
    } catch (error) {
      console.error('Delete gallery item error:', error)
      alert('Error deleting gallery item: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(item) {
    try {
      const { error } = await supabase
        .from('gallery')
        .update({ 
          is_active: !item.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (error) throw error
      fetchGalleryItems()
    } catch (error) {
      console.error('Toggle active error:', error)
      alert('Error updating status: ' + error.message)
    }
  }

  async function handleReorderItems(dragIndex, hoverIndex) {
    // Simple reorder by swapping sort_order values
    const dragItem = galleryItems[dragIndex]
    const hoverItem = galleryItems[hoverIndex]

    try {
      await Promise.all([
        supabase.from('gallery').update({ sort_order: hoverItem.sort_order }).eq('id', dragItem.id),
        supabase.from('gallery').update({ sort_order: dragItem.sort_order }).eq('id', hoverItem.id)
      ])
      fetchGalleryItems()
    } catch (error) {
      console.error('Reorder error:', error)
      alert('Error reordering items: ' + error.message)
    }
  }

  // File handling functions
  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) {
      setSelectedFile(null)
      return
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, PNG, WebP)')
      e.target.value = ''
      return
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size too large. Maximum 5MB allowed.')
      e.target.value = ''
      return
    }
    
    setSelectedFile(file)
    
    // Clear manual URL input when file is selected
    if (editingItem) {
      setEditingItem({...editingItem, image_url: ''})
    } else {
      setNewItem({...newItem, image_url: ''})
    }
  }

  function previewSelectedFile() {
    if (!selectedFile) return null
    return URL.createObjectURL(selectedFile)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">
          Gallery Management ({galleryItems.length} items)
        </h3>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          disabled={loading}
        >
          Add Photo
        </button>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h4 className="font-semibold mb-4 text-lg">Add New Gallery Photo</h4>
            <form onSubmit={handleAddItem} className="space-y-4">
              <input
                placeholder="Photo Title * (e.g., Kamar Full AC)"
                required
                value={newItem.title}
                onChange={e => setNewItem({...newItem, title: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
              />
              
              <textarea
                placeholder="Photo Description * (e.g., Kamar nyaman dengan AC dan fasilitas lengkap)"
                required
                value={newItem.description}
                onChange={e => setNewItem({...newItem, description: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                rows="3"
              />
              
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-sm font-medium mb-2">Upload Image (Recommended)</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Supported: JPG, PNG, WebP. Maximum: 5MB
                </div>
                
                {/* File Preview */}
                {selectedFile && (
                  <div className="mt-3 border rounded-lg p-3 bg-gray-50">
                    <div className="text-sm font-medium mb-2">Selected File:</div>
                    <div className="flex items-center gap-3">
                      <img 
                        src={previewSelectedFile()} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <div>
                        <div className="text-sm font-medium truncate">{selectedFile.name}</div>
                        <div className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* OR Manual URL Input */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">or enter URL manually</span>
                </div>
              </div>
              
              <div>
                <input
                  placeholder="Image URL (https://example.com/image.jpg)"
                  type="url"
                  value={newItem.image_url}
                  onChange={e => {
                    setNewItem({...newItem, image_url: e.target.value})
                    if (e.target.value.trim()) {
                      setSelectedFile(null)
                      // Reset file input
                      const fileInput = document.querySelector('input[type="file"]')
                      if (fileInput) fileInput.value = ''
                    }
                  }}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                  disabled={selectedFile !== null}
                />
                {selectedFile && (
                  <div className="text-xs text-gray-500 mt-1">
                    File upload selected. Clear file to enter URL manually.
                  </div>
                )}
              </div>

              {/* URL Image Preview */}
              {!selectedFile && newItem.image_url && newItem.image_url.startsWith('http') && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="text-sm font-medium mb-2">URL Preview:</div>
                  <img 
                    src={newItem.image_url} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded border"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'block'
                    }}
                  />
                  <div className="w-full h-32 bg-gray-200 rounded border items-center justify-center text-gray-500 text-sm" style={{display: 'none'}}>
                    Failed to load image
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Sort Order (0 = first)"
                  min="0"
                  value={newItem.sort_order}
                  onChange={e => setNewItem({...newItem, sort_order: parseInt(e.target.value) || 0})}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newItem.is_active}
                    onChange={e => setNewItem({...newItem, is_active: e.target.checked})}
                    className="rounded"
                  />
                  Show in gallery
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  type="submit" 
                  disabled={loading || uploadLoading}
                  className="btn-primary flex-1"
                >
                  {uploadLoading ? 'Uploading...' : loading ? 'Adding...' : 'Add Photo'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setNewItem({
                      title: '', description: '', image_url: '', sort_order: 0, is_active: true
                    })
                    setSelectedFile(null)
                    setShowAddModal(false)
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

      {/* Edit Item Modal - Similar structure with file upload support */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h4 className="font-semibold mb-4 text-lg">Edit Gallery Photo</h4>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <input
                placeholder="Photo Title *"
                required
                value={editingItem.title}
                onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
              />
              
              <textarea
                placeholder="Photo Description *"
                required
                value={editingItem.description}
                onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                rows="3"
              />
              
              {/* Current Image Preview */}
              {editingItem.image_url && !selectedFile && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="text-sm font-medium mb-2">Current Image:</div>
                  <img 
                    src={editingItem.image_url} 
                    alt="Current" 
                    className="w-full h-32 object-cover rounded border"
                  />
                </div>
              )}
              
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-sm font-medium mb-2">Replace with New Image</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                
                {/* New File Preview */}
                {selectedFile && (
                  <div className="mt-3 border rounded-lg p-3 bg-green-50">
                    <div className="text-sm font-medium mb-2 text-green-700">New File Selected:</div>
                    <div className="flex items-center gap-3">
                      <img 
                        src={previewSelectedFile()} 
                        alt="New Preview" 
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <div>
                        <div className="text-sm font-medium truncate">{selectedFile.name}</div>
                        <div className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Manual URL Edit */}
              <input
                placeholder="Or edit Image URL directly"
                type="url"
                value={editingItem.image_url}
                onChange={e => setEditingItem({...editingItem, image_url: e.target.value})}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                disabled={selectedFile !== null}
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Sort Order"
                  min="0"
                  value={editingItem.sort_order}
                  onChange={e => setEditingItem({...editingItem, sort_order: parseInt(e.target.value) || 0})}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-primary-500"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingItem.is_active}
                    onChange={e => setEditingItem({...editingItem, is_active: e.target.checked})}
                    className="rounded"
                  />
                  Show in gallery
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  type="submit" 
                  disabled={loading || uploadLoading}
                  className="btn-primary flex-1"
                >
                  {uploadLoading ? 'Uploading...' : loading ? 'Updating...' : 'Update Photo'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingItem(null)
                    setSelectedFile(null)
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

      {/* Gallery Items List */}
      <div className="space-y-3">
        {galleryItems.length > 0 ? (
          <>
            <div className="text-sm text-gray-600 mb-3">
              💡 Tip: Items are shown in order based on "Sort Order" value (0 = first)
            </div>
            
            {galleryItems.map((item, index) => (
              <div key={item.id} className="card border-l-4 border-l-primary-500">
                <div className="flex gap-4">
                  {/* Image Thumbnail */}
                  <div className="w-24 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/96x64/e5e7eb/6b7280?text=Error'
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-primary-700">{item.title}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          #{item.sort_order}
                        </span>
                        <span className={item.is_active ? 'pill-available' : 'pill-full'}>
                          {item.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>📷 {item.image_url.substring(0, 50)}...</span>
                      {item.updated_at && (
                        <span>• Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleToggleActive(item)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        item.is_active 
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      title={item.is_active ? 'Hide from gallery' : 'Show in gallery'}
                    >
                      {item.is_active ? 'Hide' : 'Show'}
                    </button>
                    
                    <button 
                      onClick={() => setEditingItem({...item})}
                      className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Edit
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteItem(item)}
                      className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                      Delete
                    </button>

                    {/* Reorder buttons */}
                    <div className="flex">
                      {index > 0 && (
                        <button 
                          onClick={() => handleReorderItems(index, index - 1)}
                          className="px-1 py-1 text-xs bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-l"
                          title="Move up"
                        >
                          ↑
                        </button>
                      )}
                      {index < galleryItems.length - 1 && (
                        <button 
                          onClick={() => handleReorderItems(index, index + 1)}
                          className="px-1 py-1 text-xs bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-r"
                          title="Move down"
                        >
                          ↓
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="card text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📷</div>
            <p className="text-gray-600">No gallery photos yet.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary mt-4"
            >
              Add First Photo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
