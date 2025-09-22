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
  const [tenants, setTenants] = useState([])
  const [useExistingTenant, setUseExistingTenant] = useState(true)

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id, name, phone, room_number,
          rooms (number, title)
        `)
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setTenants(data || [])
    } catch (error) {
      console.error('Fetch tenants error:', error)
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
    
    // Validation
    if (!form.tenant_name.trim()) {
      alert('Nama penghuni harus diisi')
      return
    }
    if (!form.phone.trim()) {
      alert('Nomor telepon harus diisi')
      return
    }
    if (!form.month.trim()) {
      alert('Bulan pembayaran harus diisi')
      return
    }
    if (!file) { 
      alert('Unggah bukti transfer terlebih dahulu')
      return
    }
    
    setLoading(true)

    try{
      // Upload file to storage
      const filename = `${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filename, file, { upsert: false })
        
      if(uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(uploadData.path)
      const receipt_url = urlData.publicUrl

      // Insert payment record
      const paymentData = {
        tenant_id: form.tenant_id || null,
        tenant_name: form.tenant_name.trim(),
        phone: form.phone.trim(),
        room_number: form.room_number.trim(),
        month: form.month.trim(),
        message: form.message.trim(),
        receipt_url,
        status: 'pending'
      }

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])

      if(error) throw error
      
      setSuccess('Bukti berhasil diunggah. Status: pending. Tunggu verifikasi admin.')
      setForm({
        tenant_id: '',
        tenant_name: '',
        phone: '',
        room_number: '',
        month: '',
        message: ''
      })
      setFile(null)
    }catch(err){
      console.error(err)
      alert('Terjadi error: '+err.message)
    }finally{ 
      setLoading(false)
    }
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <h3 className="font-semibold mb-4 text-lg text-primary-700">Form Bukti Pembayaran</h3>

      {/* Toggle between existing tenant or new */}
      <div className="mb-4">
        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            name="tenant_type"
            checked={useExistingTenant}
            onChange={() => setUseExistingTenant(true)}
          />
          Saya penghuni terdaftar
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="tenant_type"
            checked={!useExistingTenant}
            onChange={() => setUseExistingTenant(false)}
          />
          Input data manual
        </label>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {useExistingTenant ? (
          /* Existing Tenant Dropdown */
          <div>
            <label className="block text-sm font-medium mb-2">Pilih Nama Penghuni:</label>
            <select
              value={form.tenant_id}
              onChange={e => handleTenantSelect(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
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
            
            {/* Display selected tenant info */}
            {form.tenant_id && (
              <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
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
              className="w-full border px-3 py-2 rounded-lg"
            />
            <input
              placeholder="Nomor Telepon *"
              required
              value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full border px-3 py-2 rounded-lg"
            />
            <input
              placeholder="Nomor Kamar (opsional)"
              value={form.room_number}
              onChange={e => setForm({...form, room_number: e.target.value})}
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>
        )}

        {/* Common fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Bulan Pembayaran *:</label>
            <input
              type="month"
              placeholder="Bulan Pembayaran (eg. 2025-09)"
              required
              value={form.month}
              onChange={e => setForm({...form, month: e.target.value})}
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>

          <textarea
            placeholder="Pesan/Keterangan (opsional)"
            value={form.message}
            onChange={e => setForm({...form, message: e.target.value})}
            className="w-full border px-3 py-2 rounded-lg"
            rows="3"
          />

          <div>
            <label className="block text-sm font-medium mb-2">Unggah Bukti Transfer *:</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e => setFile(e.target.files[0])}
              className="w-full border px-3 py-2 rounded-lg"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              Format: JPG, PNG, PDF. Max: 5MB
            </div>
          </div>

          {file && (
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-4">
                {file.type && file.type.startsWith && file.type.startsWith('image') ? (
                  <img src={previewFile(file)} className="w-28 h-20 rounded object-cover" alt="Preview" />
                ) : (
                  <div className="w-28 h-20 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                    {file.name.split('.').pop().toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-gray-500">{(file.size/1024/1024).toFixed(2)} MB</div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-3 text-lg"
            >
              {loading ? 'Mengunggah...' : 'Kirim Bukti Pembayaran'}
            </button>
            
            {success && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                ✅ {success}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
