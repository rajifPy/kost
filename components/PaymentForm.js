// components/PaymentForm.js - Enhanced version with better error handling
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function PaymentForm(){
  const [form, setForm] = useState({
    tenant_id: '',
    tenant_name: '',
    phone: '',
    room_number: '',
    month: '',
    message: ''
  })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [tenants, setTenants] = useState([])
  const [useExistingTenant, setUseExistingTenant] = useState(true)

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      console.log('🔍 Fetching tenants...')
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id, name, phone, room_number,
          rooms (number, title)
        `)
        .eq('is_active', true)
        .order('name')
      
      if (error) {
        console.error('❌ Fetch tenants error:', error)
        // Don't throw error, just log it - form can still work manually
        setTenants([])
        return
      }
      
      console.log('✅ Tenants fetched:', data?.length || 0)
      setTenants(data || [])
    } catch (error) {
      console.error('❌ Unexpected fetch error:', error)
      setTenants([])
    }
  }

  function handleTenantSelect(tenantId) {
    const selectedTenant = tenants.find(t => t.id === tenantId)
    if (selectedTenant) {
      setForm({
        ...form,
        tenant_id: tenantId,
        tenant_name: selectedTenant.name,
        phone: selectedTenant.phone,
        room_number: selectedTenant.rooms?.number || selectedTenant.room_number || ''
      })
    } else {
      setForm({
        ...form,
        tenant_id: '',
        tenant_name: '',
        phone: '',
        room_number: ''
      })
    }
  }

  function previewFile(file){
    if(!file) return null
    return URL.createObjectURL(file)
  }

  async function handleSubmit(e){
    e.preventDefault()
    console.log('🚀 Starting payment submission...')
    
    // Clear previous messages
    setError(null)
    setSuccess(null)
    
    // Enhanced validation
    if (!form.tenant_name.trim()) {
      setError('Nama penghuni harus diisi')
      return
    }
    if (!form.phone.trim()) {
      setError('Nomor telepon harus diisi')
      return
    }
    if (!form.month.trim()) {
      setError('Bulan pembayaran harus diisi')
      return
    }
    if (!file) { 
      setError('Unggah bukti transfer terlebih dahulu')
      return
    }
    
    // File validation
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('File terlalu besar. Maksimal 5MB')
      return
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Format file tidak didukung. Gunakan JPG, PNG, atau PDF')
      return
    }
    
    setLoading(true)

    try{
      console.log('📤 Uploading receipt file...')
      
      // Upload file to storage
      const filename = `payment_${Date.now()}_${Math.random().toString(36).substring(2)}_${file.name}`
      console.log('📁 Uploading as:', filename)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filename, file, { 
          upsert: false,
          cacheControl: '3600'
        })
        
      if(uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }
      
      console.log('✅ File uploaded successfully:', uploadData.path)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(uploadData.path)
      const receipt_url = urlData.publicUrl
      
      console.log('🔗 Receipt URL:', receipt_url)

      // Prepare payment data
      const paymentData = {
        tenant_id: form.tenant_id || null,
        tenant_name: form.tenant_name.trim(),
        phone: form.phone.trim(),
        room_number: form.room_number.trim() || null,
        month: form.month.trim(),
        message: form.message.trim() || null,
        receipt_url,
        status: 'pending'
      }
      
      console.log('💾 Inserting payment data:', paymentData)

      // Insert payment record
      const { data: paymentInsert, error: paymentError } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()

      if(paymentError) {
        console.error('❌ Payment insert error:', paymentError)
        
        // Specific error handling for RLS
        if (paymentError.message.includes('row-level security') || paymentError.message.includes('RLS')) {
          throw new Error('Database security error. Please contact admin to fix Row Level Security policies.')
        }
        
        if (paymentError.message.includes('permission denied')) {
          throw new Error('Permission denied. Please contact admin to fix database permissions.')
        }
        
        throw new Error(`Database error: ${paymentError.message}`)
      }
      
      console.log('✅ Payment inserted successfully:', paymentInsert)
      
      // Success - reset form
      setSuccess('✅ Bukti berhasil diunggah! Status: Pending. Admin akan memverifikasi pembayaran Anda.')
      setForm({
        tenant_id: '',
        tenant_name: '',
        phone: '',
        room_number: '',
        month: '',
        message: ''
      })
      setFile(null)
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''
      
    } catch(err) {
      console.error('💥 Payment submission failed:', err)
      setError(err.message || 'Terjadi kesalahan tidak terduga')
    } finally { 
      setLoading(false)
    }
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <h3 className="font-semibold mb-4 text-lg text-primary-700">Form Bukti Pembayaran</h3>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <div className="flex items-start gap-2">
            <span className="text-red-500">❌</span>
            <div>
              <div className="font-medium">Error:</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <div className="flex items-start gap-2">
            <span className="text-green-500">✅</span>
            <div>
              <div className="font-medium">Berhasil!</div>
              <div className="text-sm">{success}</div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle between existing tenant or new */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium mb-2">Pilih cara mengisi data:</div>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            name="tenant_type"
            checked={useExistingTenant}
            onChange={() => setUseExistingTenant(true)}
            className="text-primary-600"
          />
          Saya penghuni terdaftar ({tenants.length} tersedia)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="tenant_type"
            checked={!useExistingTenant}
            onChange={() => setUseExistingTenant(false)}
            className="text-primary-600"
          />
          Input data manual
        </label>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {useExistingTenant ? (
          /* Existing Tenant Dropdown */
          <div>
            <label className="block text-sm font-medium mb-2">Pilih Nama Penghuni *:</label>
            <select
              value={form.tenant_id}
              onChange={e => handleTenantSelect(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">-- Pilih Penghuni --</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} - {tenant.phone} 
                  {tenant.rooms?.number && ` (Kamar ${tenant.rooms.number})`}
                </option>
              ))}
            </select>
            
            {tenants.length === 0 && (
              <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                ⚠️ Tidak ada data penghuni. Gunakan "Input data manual" atau hubungi admin.
              </div>
            )}
            
            {/* Display selected tenant info */}
            {form.tenant_id && (
              <div className="mt-2 p-3 bg-blue-50 rounded border text-sm">
                <div><strong>Nama:</strong> {form.tenant_name}</div>
                <div><strong>Phone:</strong> {form.phone}</div>
                {form.room_number && <div><strong>Kamar:</strong> {form.room_number}</div>}
              </div>
            )}
          </div>
        ) : (
          /* Manual Input */
          <div className="space-y-3">
            <input
              placeholder="Nama Penghuni *"
              required
              value={form.tenant_name}
              onChange={e => setForm({...form, tenant_name: e.target.value})}
              className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <input
              placeholder="Nomor Telepon * (contoh: 081234567890)"
              required
              value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <input
              placeholder="Nomor Kamar (opsional, contoh: KM1)"
              value={form.room_number}
              onChange={e => setForm({...form, room_number: e.target.value})}
              className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Common fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Bulan Pembayaran *:</label>
            <input
              type="month"
              placeholder="Bulan Pembayaran (contoh: 2025-09)"
              required
              value={form.month}
              onChange={e => setForm({...form, month: e.target.value})}
              className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              Pilih bulan dan tahun pembayaran yang sesuai
            </div>
          </div>

          <textarea
            placeholder="Pesan/Keterangan (opsional)"
            value={form.message}
            onChange={e => setForm({...form, message: e.target.value})}
            className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500"
            rows="3"
          />

          <div>
            <label className="block text-sm font-medium mb-2">Unggah Bukti Transfer *:</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={e => setFile(e.target.files[0])}
              className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              Format: JPG, PNG, PDF. Maksimal: 5MB
            </div>
          </div>

          {/* File Preview */}
          {file && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-medium mb-2">Preview File:</div>
              <div className="flex items-center gap-4">
                {file.type && file.type.startsWith('image') ? (
                  <img 
                    src={previewFile(file)} 
                    className="w-32 h-24 rounded object-cover border" 
                    alt="Preview bukti transfer" 
                  />
                ) : (
                  <div className="w-32 h-24 rounded bg-gray-200 flex items-center justify-center text-sm text-gray-600 border">
                    <div className="text-center">
                      <div className="text-2xl mb-1">📄</div>
                      {file.name.split('.').pop().toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-gray-500">
                    {(file.size/1024/1024).toFixed(2)} MB
                  </div>
                  <div className="text-xs text-gray-500">
                    {file.type}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mengunggah...' : 'Kirim Bukti Pembayaran'}
            </button>
            
            <div className="mt-3 text-xs text-gray-500 text-center">
              Dengan mengirim, Anda setuju bahwa data akan diproses untuk verifikasi pembayaran
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
