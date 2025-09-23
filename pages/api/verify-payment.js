// pages/api/verify-payment.js - UPDATED VERSION with Email + WhatsApp
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceKey)

// ✅ Check configurations
function isWhatsAppConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)
}

function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY
}

// ✅ Format Indonesian phone numbers
function formatPhoneNumber(phone) {
  if (!phone) return null
  let cleaned = phone.replace(/[\s\-\.]/g, '')
  
  if (cleaned.startsWith('08')) {
    return '+62' + cleaned.substring(1) 
  } else if (cleaned.startsWith('62')) {
    return '+' + cleaned  
  } else if (cleaned.startsWith('+62')) {
    return cleaned 
  } else if (!cleaned.startsWith('+')) {
    return '+62' + cleaned 
  }
  return cleaned
}

// ✅ Send WhatsApp notification
async function sendWhatsAppNotification(phone, message) {
  try {
    if (!isWhatsAppConfigured()) {
      return { success: false, error: 'WhatsApp service not configured' }
    }

    const formattedPhone = formatPhoneNumber(phone)
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone number format' }
    }

    console.log('📱 Sending WhatsApp to:', formattedPhone)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app'
    
    const response = await fetch(`${baseUrl}/api/send-whatsapp`, {
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
      return { success: false, error: result.error || 'Failed to send WhatsApp' }
    }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ✅ Send Email notification
async function sendEmailNotification(email, type, paymentData) {
  try {
    if (!isEmailConfigured()) {
      return { success: false, error: 'Email service not configured' }
    }

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid or missing email address' }
    }

    console.log('📧 Sending email to:', email)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app'
    
    const response = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        type: type,
        data: paymentData
      })
    })

    const result = await response.json()
    
    if (response.ok && result.success) {
      return { success: true, emailId: result.emailId, email: email }
    } else {
      return { success: false, error: result.error || 'Failed to send email' }
    }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ✅ Get tenant email from database (if exists)
async function getTenantEmail(payment) {
  try {
    // If payment has tenant_id, get email from tenants table
    if (payment.tenant_id) {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('email')
        .eq('id', payment.tenant_id)
        .single()
      
      if (!error && tenant?.email) {
        return tenant.email
      }
    }
    
    // Fallback: try to find tenant by phone number
    if (payment.phone) {
      const { data: tenantByPhone, error } = await supabase
        .from('tenants')
        .select('email')
        .eq('phone', payment.phone)
        .single()
      
      if (!error && tenantByPhone?.email) {
        return tenantByPhone.email
      }
    }
    
    return null
  } catch (error) {
    console.log('⚠️ Error getting tenant email:', error.message)
    return null
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
  const { id, action, admin_notes } = req.body

  // Validation
  if (!id || !action || !['success', 'rejected'].includes(action)) {
    return res.status(400).json({
      error: 'Invalid parameters',
      required: { id: 'payment UUID', action: 'success|rejected' }
    })
  }

  // Check environment
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    console.log('🔍 Fetching payment:', id)
    
    // Get payment data
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    console.log('✅ Payment found:', {
      id: payment.id,
      tenant_name: payment.tenant_name,
      phone: payment.phone
    })

    // Update payment status
    const newStatus = action === 'success' ? 'success' : 'rejected'
    
    console.log('🔄 Updating payment status to:', newStatus)

    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        admin_notes: admin_notes || null
      })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: 'Database update failed' })
    }

    console.log('✅ Payment status updated successfully')

    // ✅ Prepare notification data
    const notificationData = {
      tenant_name: payment.tenant_name,
      month: payment.month,
      room_number: payment.room_number,
      phone: payment.phone,
      receipt_url: payment.receipt_url,
      admin_notes: admin_notes
    }

    // ✅ Get tenant email
    const tenantEmail = await getTenantEmail(payment)
    console.log('📧 Tenant email:', tenantEmail || 'Not found')

    // ✅ Send notifications concurrently
    const notifications = {
      whatsapp: { success: false, error: 'Not attempted' },
      email: { success: false, error: 'Not attempted' }
    }

    // Prepare WhatsApp message
    let whatsappMessage = ''
    if (payment.phone) {
      whatsappMessage = action === 'success' 
        ? `✅ *PEMBAYARAN DITERIMA*

Halo ${payment.tenant_name}! 👋

Pembayaran Anda telah *BERHASIL* diverifikasi:

📋 *Detail:*
• Nama: ${payment.tenant_name}
• Bulan: ${payment.month}
${payment.room_number ? `• Kamar: ${payment.room_number}` : ''}

✅ Status: *LUNAS*

${admin_notes ? `📝 *Catatan:* ${admin_notes}\n\n` : ''}Terima kasih atas pembayaran tepat waktu! 🙏

---
*Kost Pak Trisno*
📱 Admin: +6281234567890`
        : `❌ *PEMBAYARAN DITOLAK*

Halo ${payment.tenant_name},

Maaf, pembayaran Anda *DITOLAK*:

📋 *Detail:*
• Nama: ${payment.tenant_name}
• Bulan: ${payment.month}
${payment.room_number ? `• Kamar: ${payment.room_number}` : ''}

❌ Status: *DITOLAK*

${admin_notes ? `📝 *Alasan:* ${admin_notes}\n\n` : ''}Silakan hubungi admin atau upload ulang bukti transfer yang jelas.

📱 *Hubungi Admin:* +6281234567890

---
*Kost Pak Trisno*`
    }

    // Send notifications in parallel
    const notificationPromises = []

    // WhatsApp notification
    if (payment.phone) {
      notificationPromises.push(
        sendWhatsAppNotification(payment.phone, whatsappMessage)
          .then(result => { notifications.whatsapp = result })
          .catch(error => { notifications.whatsapp = { success: false, error: error.message } })
      )
    }

    // Email notification
    if (tenantEmail) {
      const emailType = action === 'success' ? 'payment_accepted' : 'payment_rejected'
      notificationPromises.push(
        sendEmailNotification(tenantEmail, emailType, notificationData)
          .then(result => { notifications.email = result })
          .catch(error => { notifications.email = { success: false, error: error.message } })
      )
    }

    // Wait for all notifications to complete
    await Promise.allSettled(notificationPromises)

    // ✅ Generate response message
    const successCount = [notifications.whatsapp.success, notifications.email.success].filter(Boolean).length
    const totalAttempted = notificationPromises.length

    let responseMessage = `✅ Payment ${newStatus}ed successfully!`
    
    if (totalAttempted === 0) {
      responseMessage += `\n\n⚠️ No contact information available for notifications.\nPlease inform tenant manually: ${payment.phone || 'Phone not provided'}`
    } else if (successCount === totalAttempted) {
      responseMessage += `\n\n🎉 All notifications sent successfully!`
      if (notifications.whatsapp.success) responseMessage += `\n📱 WhatsApp: ${notifications.whatsapp.phone}`
      if (notifications.email.success) responseMessage += `\n📧 Email: ${tenantEmail}`
    } else if (successCount > 0) {
      responseMessage += `\n\n⚠️ Partial notification success (${successCount}/${totalAttempted}):`
      if (notifications.whatsapp.success) responseMessage += `\n✅ WhatsApp: Sent to ${notifications.whatsapp.phone}`
      else if (payment.phone) responseMessage += `\n❌ WhatsApp: ${notifications.whatsapp.error}`
      
      if (notifications.email.success) responseMessage += `\n✅ Email: Sent to ${tenantEmail}`
      else if (tenantEmail) responseMessage += `\n❌ Email: ${notifications.email.error}`
    } else {
      responseMessage += `\n\n❌ All notifications failed. Please inform tenant manually:`
      responseMessage += `\n📱 Phone: ${payment.phone || 'Not provided'}`
      if (tenantEmail) responseMessage += `\n📧 Email: ${tenantEmail}`
      responseMessage += `\n\n💡 Check service configurations (RESEND_API_KEY, TWILIO_* variables)`
    }

    // Final response
    const response = {
      success: true,
      payment: {
        id: payment.id,
        tenant_name: payment.tenant_name,
        phone: payment.phone,
        room_number: payment.room_number,
        month: payment.month,
        status: newStatus,
        admin_notes: admin_notes
      },
      notifications: {
        attempted: totalAttempted,
        successful: successCount,
        whatsapp: notifications.whatsapp,
        email: notifications.email,
        tenant_email: tenantEmail
      },
      message: responseMessage,
      timestamp: new Date().toISOString()
    }

    console.log('🎉 API Success with notifications:', {
      whatsapp: notifications.whatsapp.success,
      email: notifications.email.success,
      total: `${successCount}/${totalAttempted}`
    })

    return res.status(200).json(response)

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
