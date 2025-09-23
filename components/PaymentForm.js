// components/PaymentForm.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function PaymentForm() {
  const [formData, setFormData] = useState({
    tenant_name: '',
    phone: '',
    month: '',
    room_number: '',
    message: '',
    receipt_file: null
  })
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Fetch available rooms for dropdown
  useEffect(() => {
    fetchRooms()
  }, [])

  async function fetchRooms() {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, number, title, price')
        .order('number')
      
      if (error) throw error
      setRooms(data || [])
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }

  async function uploadReceipt(file) {
    if (!file) return null

    try {
      setUploading(true)
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File terlalu besar. Maksimal 5MB.')
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipe file tidak didukung. Gunakan JPG, PNG, GIF, atau PDF.')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      
      console.log('Uploading receipt:', fileName)
      
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Upload error:', error)
        
        // Handle bucket not found error
        if (error.message.includes('not found') || error.message.includes('bucket')) {
          throw new Error('Sistem upload belum dikonfigurasi. Hubungi admin.')
        }
        
        throw error
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(data.path)
      
      console.log('Receipt uploaded successfully:', urlData.publicUrl)
      return urlData.publicUrl
      
    } catch (error) {
      console.error('Receipt upload error:', error)
      throw error
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      // Validation
      if (!formData.tenant_name.trim()) {
        throw new Error('Nama penyewa wajib diisi')
      }
      if (!formData.phone.trim()) {
        throw new Error('Nomor telepon wajib diisi')
      }
      if (!formData.month.trim()) {
        throw new Error('Bulan pembayaran wajib diisi')
      }

      // Upload receipt if provided
      let receiptUrl = null
      if (formData.receipt_file) {
        receiptUrl = await uploadReceipt(formData.receipt_file)
      }

      // Get room info if selected
      const selectedRoom = rooms.find(r => r.id === formData.room_number)
      const roomNumber = selectedRoom ? selectedRoom.number : formData.room_number

      // Insert payment record
      const { error } = await supabase.from('payments').insert([{
        tenant_name: formData.tenant_name.trim(),
        phone: formData.phone.trim(),
        month: formData.month,
        room_number: roomNumber,
        message: formData.message.trim() || null,
        receipt_url: receiptUrl,
        status: 'pending'
      }])

      if (error) {
        console.error('Insert payment error:', error)
        throw error
      }

      console.log('Payment submitted successfully')
      setSuccess(true)
      
      // Reset form
      setFormData({
        tenant_name: '',
        phone: '',
        month: '',
        room_number: '',
        message: '',
        receipt_file: null
      })

      // Clear file input
      const fileInput = document.getElementById('receipt_file')
      if (fileInput) fileInput.value = ''

    } catch (error) {
      console.error('Submit payment error:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, files } = e.target
    
    if (name === 'receipt_file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0] || null
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  // Generate month options
  const generateMonthOptions = () => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    
    const currentYear = new Date().getFullYear()
    const options = []
    
    // Current year and next year
    for (let year of [currentYear, currentYear + 1]) {
      months.forEach((month, index) => {
        const value = `${year}-${String(index + 1).padStart(2, '0')}`
        const label = `${month} ${year}`
        options.push({ value, label })
      })
    }
    
    return options
  }

  if (success) {
    return (
      <div className="card text-center max-w-lg mx-auto">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-green-600 mb-2">
          Pembayaran Berhasil Dikirim!
        </h3>
        <p className="text-gray-600 mb-4">
          Terima kasih! Bukti pembayaran Anda telah diterima dan sedang diproses. 
          Admin akan memverifikasi dalam 1x24 jam.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h4 className="font-semibold text-blue-800 mb-2">Informasi Penting:</h4>
          <ul className="text-sm text-blue-700 text-left space-y-1">
            <li>• Status pembayaran akan dikirim via WhatsApp</li>
            <li>• Simpan nomor admin: <strong>+6281234567890</strong></li>
            <li>• Untuk pertanyaan, hubungi admin langsung</li>
          </ul>
        </div>
        <button 
          onClick={() => setSuccess(false)}
          className="btn-primary"
        >
          Kirim Pembayaran Lain
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Payment Instructions */}
      <div className="card mb-6 bg-blue-50 border-l-4 border-l-blue-500">
        <h3 className="font-semibold text-blue-800 mb-3">📋 Cara Pembayaran</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <div>
            <strong>1. Transfer ke Rekening:</strong>
            <div className="mt-1 ml-4">
              <div>🏦 <strong>BCA:</strong> 1234567890</div>
              <div>🏦 <strong>BRI:</strong> 0987654321</div>
              <div>📝 <strong>A/n:</strong> Pak Trisno</div>
            </div>
          </div>
          <div>
            <strong>2. Upload Bukti Transfer:</strong> Gunakan form di bawah ini
          </div>
          <div>
            <strong>3. Tunggu Konfirmasi:</strong> Admin akan memverifikasi via WhatsApp
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h3 className="font-semibold text-lg mb-4">💳 Form Upload Bukti Pembayaran</h3>

        {/* Tenant Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nama Penyewa *
          </label>
          <input
            type="text"
            name="tenant_name"
            required
            value={formData.tenant_name}
            onChange={handleInputChange}
            placeholder="Masukkan nama lengkap"
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nomor WhatsApp *
          </label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="08123456789 atau +6281234567890"
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            Konfirmasi pembayaran akan dikirim ke nomor ini
          </div>
        </div>

        {/* Month Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bulan Pembayaran *
          </label>
          <select
            name="month"
            required
            value={formData.month}
            onChange={handleInputChange}
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Pilih bulan pembayaran</option>
            {generateMonthOptions().map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Room Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kamar
          </label>
          <select
            name="room_number"
            value={formData.room_number}
            onChange={handleInputChange}
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Pilih kamar (opsional)</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.number} - {room.title} 
                {room.price && ` (Rp ${room.price.toLocaleString()})`}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500 mt-1">
            Atau ketik nomor kamar secara manual jika tidak ada dalam daftar
          </div>
          {!formData.room_number && (
            <input
              type="text"
              name="room_number"
              value={typeof formData.room_number === 'string' ? formData.room_number : ''}
              onChange={handleInputChange}
              placeholder="Atau ketik nomor kamar (misal: KM1, Kamar 5)"
              className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mt-2"
            />
          )}
        </div>

        {/* Receipt Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bukti Transfer
          </label>
          <input
            type="file"
            id="receipt_file"
            name="receipt_file"
            accept="image/*,.pdf"
            onChange={handleInputChange}
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            Upload screenshot atau foto bukti transfer (JPG, PNG, PDF - maks 5MB)
          </div>
          
          {formData.receipt_file && (
            <div className="mt-2 p-2 bg-green-50 rounded border">
              <div className="text-sm text-green-700">
                📄 File dipilih: {formData.receipt_file.name} 
                ({(formData.receipt_file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pesan Tambahan
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder="Pesan tambahan untuk admin (opsional)"
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows="3"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || uploading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Mengupload bukti...
              </>
            ) : loading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Mengirim data...
              </>
            ) : (
              '📤 Kirim Bukti Pembayaran'
            )}
          </button>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-l-yellow-400">
          <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Penting!</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Pastikan nomor WhatsApp aktif untuk menerima konfirmasi</li>
            <li>• Pembayaran paling lambat tanggal 5 setiap bulan</li>
            <li>• Bukti transfer yang tidak jelas akan ditolak</li>
            <li>• Hubungi admin jika ada kendala: <strong>+6281234567890</strong></li>
          </ul>
        </div>
      </form>
    </div>
  )
}
