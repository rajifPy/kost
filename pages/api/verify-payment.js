// pages/api/verify-payment.js - FIXED VERSION: Direct integration, no fetch loops
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import Twilio from 'twilio'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceKey)

// 🚨 Set maximum duration for Vercel
export const config = {
  maxDuration: 30, // 30 seconds max (instead of 300)
}

// ✅ Direct Twilio client (no HTTP fetch)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

// ✅ Direct Resend client (no HTTP fetch)  
const resendClient = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// ✅ Configuration checkers
function isWhatsAppConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)
}

function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY
}

// ✅ Phone number formatter
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

// ✅ Direct WhatsApp send (no fetch loop)
async function sendWhatsAppDirect(phone, message) {
  try {
    if (!twilioClient || !isWhatsAppConfigured()) {
      return { success: false, error: 'WhatsApp service not configured' }
    }

    const formattedPhone = formatPhoneNumber(phone)
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone number format' }
    }

    console.log('📱 Sending WhatsApp directly via Twilio client')

    const result = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${formattedPhone}`,
      body: message
    })

    console.log('✅ WhatsApp sent successfully:', result.sid)
    return { success: true, sid: result.sid, phone: formattedPhone }
    
  } catch (error) {
    console.error('❌ WhatsApp send error:', error)
    return { success: false, error: error.message }
  }
}

// ✅ Email template generator
function getEmailTemplate(type, data) {
  const templates = {
    payment_accepted: {
      subject: '✅ Pembayaran Diterima - Kost Pak Trisno',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">✅ Pembayaran Berhasil Diterima</h2>
          <p>Halo <strong>${data.tenant_name}</strong>,</p>
          <p>Pembayaran Anda telah <strong>berhasil diverifikasi</strong>!</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📋 Detail Pembayaran:</h3>
            <ul>
              <li><strong>Nama:</strong> ${data.tenant_name}</li>
              <li><strong>Bulan:</strong> ${data.month}</li>
              ${data.room_number ? `<li><strong>Kamar:</strong> ${data.room_number}</li>` : ''}
              <li><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">LUNAS ✅</span></li>
            </ul>
          </div>

          ${data.admin_notes ? `
            <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <strong>📝 Catatan Admin:</strong><br>
              ${data.admin_notes}
            </div>
          ` : ''}

          <p>🎉 Terima kasih atas pembayaran tepat waktu!</p>
          
          <hr style="margin: 30px 0;">
          <div style="text-align: center; color: #666; font-size: 14px;">
            <strong>Kost Pak Trisno</strong><br>
            📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya<br>
            📱 Admin: +6281234567890
          </div>
        </div>
      `
    },
    payment_rejected: {
      subject: '❌ Pembayaran Ditolak - Kost Pak Trisno',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">❌ Pembayaran Ditolak</h2>
          <p>Halo <strong>${data.tenant_name}</strong>,</p>
          <p>Maaf, pembayaran yang Anda submit <strong>belum dapat kami terima</strong>.</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📋 Detail Pembayaran:</h3>
            <ul>
              <li><strong>Nama:</strong> ${data.tenant_name}</li>
              <li><strong>Bulan:</strong> ${data.month}</li>
              ${data.room_number ? `<li><strong>Kamar:</strong> ${data.room_number}</li>` : ''}
              <li><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">DITOLAK ❌</span></li>
            </ul>
          </div>

          ${data.admin_notes ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <strong>📝 Alasan Penolakan:</strong><br>
              ${data.admin_notes}
            </div>
          ` : ''}

          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px;">
            <h3>🔄 Langkah Selanjutnya:</h3>
            <ol>
              <li>Pastikan bukti transfer jelas dan terbaca</li>
              <li>Cek nominal transfer sesuai tagihan</li>
              <li>Upload ulang via website</li>
              <li>Atau hubungi admin langsung</li>
            </ol>
          </div>

          <hr style="margin: 30px 0;">
          <div style="text-align: center; color: #666; font-size: 14px;">
            <strong>Kost Pak Trisno</strong><br>
            📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya<br>
            📱 Admin: +6281234567890
          </div>
        </div>
      `
    }
  }
  return templates[type]
}

// ✅ Direct Email send (no fetch loop)
async function sendEmailDirect(email, type, paymentData) {
  try {
    if (!resendClient || !isEmailConfigured()) {
      return { success: false, error: 'Email service not configured' }
    }

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid or missing email address' }
    }

    console.log('📧 Sending email directly via Resend client')

    const template = getEmailTemplate(type, paymentData)
    if (!template) {
      return { success: false, error: 'Unknown email template type' }
    }

    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'
    const fromName = process.env.EMAIL_FROM_NAME || 'Kost Pak Trisno'

    const result = await resendClient.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: template.subject,
      html: template.html
    })

    console.log('✅ Email sent successfully:', result.data?.id)
    return { success: true, emailId: result.data?.id, email: email }
    
  } catch (error) {
    console.error('❌ Email send error:', error)
    return { success: false, error: error.message }
  }
}

// ✅ Get tenant email from database
async function getTenantEmail(payment) {
  try {
    // Priority 1: Email from payment record directly (if column exists)
    if (payment.email && payment.email.includes('@')) {
      console.log('📧 Using email from payment record:', payment.email)
      return payment.email
    }
    
    // Priority 2: Email from linked tenant
    if (payment.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('email')
        .eq('id', payment.tenant_id)
        .single()
      
      if (tenant?.email) {
        console.log('📧 Using email from tenant record:', tenant.email)
        return tenant.email
      }
    }
    
    // Priority 3: Email from tenant matched by phone
    if (payment.phone) {
      const { data: tenantByPhone } = await supabase
        .from('tenants')
        .select('email')
        .eq('phone', payment.phone)
        .single()
      
      if (tenantByPhone?.email) {
        console.log('📧 Using email from tenant (matched by phone):', tenantByPhone.email)
        return tenantByPhone.email
      }
    }
    
    console.log('⚠️ No email found for payment:', payment.id)
    return null
  } catch (error) {
    console.log('⚠️ Error getting tenant email:', error.message)
    return null
  }
}

export default async function handler(req, res) {
  // Set response timeout headers
  res.setHeader('Cache-Control', 'no-cache')
  
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'})
  }

  console.log('🚀 Verify Payment API called (Direct Integration)')
  const startTime = Date.now()
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

    console.log('✅ Payment found:', payment.tenant_name)

    // Update payment status
    const newStatus = action === 'success' ? 'success' : 'rejected'
    
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

    console.log('✅ Payment status updated to:', newStatus)

    // ✅ Prepare notification data
    const notificationData = {
      tenant_name: payment.tenant_name,
      month: payment.month,
      room_number: payment.room_number,
      phone: payment.phone,
      admin_notes: admin_notes
    }

    // ✅ Get tenant email
    const tenantEmail = await getTenantEmail(payment)

    // ✅ Send notifications with timeout protection
    const notifications = {
      whatsapp: { success: false, error: 'Not attempted' },
      email: { success: false, error: 'Not attempted' }
    }

    // WhatsApp message
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

    // ✅ Send notifications with Promise.allSettled for timeout protection
    console.log('📤 Sending notifications...')
    const notificationPromises = []

    // WhatsApp notification (max 15 seconds)
    if (payment.phone) {
      const whatsappPromise = Promise.race([
        sendWhatsAppDirect(payment.phone, whatsappMessage),
        new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'Timeout after 15s' }), 15000))
      ])
      notificationPromises.push(
        whatsappPromise.then(result => { notifications.whatsapp = result })
      )
    }

    // Email notification (max 10 seconds)  
    if (tenantEmail) {
      const emailType = action === 'success' ? 'payment_accepted' : 'payment_rejected'
      const emailPromise = Promise.race([
        sendEmailDirect(tenantEmail, emailType, notificationData),
        new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'Timeout after 10s' }), 10000))
      ])
      notificationPromises.push(
        emailPromise.then(result => { notifications.email = result })
      )
    }

    // Wait for all notifications (with timeout protection)
    await Promise.allSettled(notificationPromises)

    // Calculate execution time
    const executionTime = Date.now() - startTime
    console.log(`⏱️ Total execution time: ${executionTime}ms`)

    // ✅ Generate response message
    const successCount = [notifications.whatsapp.success, notifications.email.success].filter(Boolean).length
    const totalAttempted = notificationPromises.length

    let responseMessage = `✅ Payment ${newStatus}ed successfully! (${executionTime}ms)`
    
    if (totalAttempted === 0) {
      responseMessage += `\n\n⚠️ No contact information available for notifications.`
    } else if (successCount === totalAttempted) {
      responseMessage += `\n\n🎉 All notifications sent successfully!`
      if (notifications.whatsapp.success) responseMessage += `\n📱 WhatsApp: ${notifications.whatsapp.phone}`
      if (notifications.email.success) responseMessage += `\n📧 Email: ${tenantEmail}`
    } else if (successCount > 0) {
      responseMessage += `\n\n⚠️ Partial notification success (${successCount}/${totalAttempted}):`
      if (notifications.whatsapp.success) responseMessage += `\n✅ WhatsApp: Sent`
      else if (payment.phone) responseMessage += `\n❌ WhatsApp: ${notifications.whatsapp.error}`
      
      if (notifications.email.success) responseMessage += `\n✅ Email: Sent`
      else if (tenantEmail) responseMessage += `\n❌ Email: ${notifications.email.error}`
    } else {
      responseMessage += `\n\n❌ All notifications failed. Manual contact required:`
      responseMessage += `\n📱 Phone: ${payment.phone || 'Not provided'}`
      if (tenantEmail) responseMessage += `\n📧 Email: ${tenantEmail}`
    }

    // Final response
    const response = {
      success: true,
      payment: {
        id: payment.id,
        tenant_name: payment.tenant_name,
        phone: payment.phone,
        status: newStatus
      },
      notifications: {
        attempted: totalAttempted,
        successful: successCount,
        whatsapp: notifications.whatsapp,
        email: notifications.email,
        tenant_email: tenantEmail
      },
      performance: {
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString()
      },
      message: responseMessage
    }

    console.log('🎉 API Success:', `${successCount}/${totalAttempted} notifications sent`)
    return res.status(200).json(response)

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('💥 Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    })
  }
}
