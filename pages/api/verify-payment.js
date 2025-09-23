// pages/api/verify-payment.js - FIXED VERSION
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceKey)

// ✅ WhatsApp Configuration
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM

// Format phone number untuk Indonesia
function formatPhoneNumber(phone) {
  if (!phone) return null
  let cleaned = phone.replace(/[\s\-\.]/g, '')
  
  if (cleaned.startsWith('08')) {
    return '+62' + cleaned.substring(1) // 08123 -> +62123
  } else if (cleaned.startsWith('62')) {
    return '+' + cleaned // 62123 -> +62123
  } else if (cleaned.startsWith('+62')) {
    return cleaned // +62123 -> +62123
  }
  return '+62' + cleaned // fallback
}

// ✅ Send WhatsApp Function
async function sendWhatsAppNotification(phone, message) {
  try {
    // Check configuration
    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppFrom) {
      return {
        success: false,
        error: 'Twilio configuration incomplete'
      }
    }

    const formattedPhone = formatPhoneNumber(phone)
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone format' }
    }

    // Call WhatsApp API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app'}/api/send-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: formattedPhone,
        message: message
      })
    })

    const result = await response.json()
    
    if (response.ok && result.success) {
      return { success: true, sid: result.sid, phone: formattedPhone }
    } else {
      return { success: false, error: result.error || 'Failed to send' }
    }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'})
  }

  console.log('🚀 Verify Payment API called')
  const { id, action } = req.body

  // Validation
  if (!id || !action || !['success', 'rejected'].includes(action)) {
    return res.status(400).json({
      error: 'Invalid parameters',
      required: { id: 'payment UUID', action: 'success|rejected' }
    })
  }

  try {
    // ✅ Get payment data
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    // ✅ Update payment status
    const newStatus = action === 'success' ? 'success' : 'rejected'
    
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: 'Database update failed' })
    }

    // ✅ Send WhatsApp notification
    let whatsappResult = { success: false, error: 'Phone number missing' }
    
    if (payment.phone) {
      const message = action === 'success' 
        ? `✅ *PEMBAYARAN DITERIMA*

Halo ${payment.tenant_name}! 👋

Pembayaran Anda telah *BERHASIL* diverifikasi:

📋 *Detail:*
- Nama: ${payment.tenant_name}
- Bulan: ${payment.month}
${payment.room_number ? `• Kamar: ${payment.room_number}` : ''}

✅ Status: *LUNAS*

Terima kasih atas pembayaran tepat waktu! 🙏

---
*Kost Pak Trisno*
📱 Admin: +6281234567890`
        : `❌ *PEMBAYARAN DITOLAK*

Halo ${payment.tenant_name},

Maaf, pembayaran Anda *DITOLAK*:

📋 *Detail:*
- Nama: ${payment.tenant_name}
- Bulan: ${payment.month}

❌ Status: *DITOLAK*

Silakan hubungi admin untuk klarifikasi atau kirim ulang bukti transfer yang jelas.

📱 *Hubungi Admin:* +6281234567890

---
*Kost Pak Trisno*`

      whatsappResult = await sendWhatsAppNotification(payment.phone, message)
    }

    // ✅ Final response
    return res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        tenant_name: payment.tenant_name,
        phone: payment.phone,
        room_number: payment.room_number,
        month: payment.month,
        status: newStatus
      },
      whatsapp_notification: whatsappResult,
      message: whatsappResult.success 
        ? `Payment ${newStatus}ed successfully! WhatsApp sent to ${payment.phone}` 
        : `Payment ${newStatus}ed successfully! WhatsApp failed: ${whatsappResult.error}`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Verify payment error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
