// ========================================
// FILE 1: pages/api/send-email-brevo.js
// ========================================

import SibApiV3Sdk from 'sib-api-v3-sdk'

// Initialize Brevo client
const defaultClient = SibApiV3Sdk.ApiClient.instance
const apiKey = defaultClient.authentications['api-key']
apiKey.apiKey = process.env.BREVO_API_KEY

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()

// Email templates (same as before)
function getEmailTemplate(type, data) {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    background: #f8f9fa;
    padding: 20px;
  `

  const cardStyle = `
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `

  const templates = {
    payment_accepted: {
      subject: '✅ Pembayaran Diterima - Kost Pak Trisno',
      html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #16a34a; margin-bottom: 20px;">✅ Pembayaran Berhasil Diterima</h2>
            <p>Halo <strong>${data.tenant_name}</strong>,</p>
            <p>Kabar baik! Pembayaran Anda telah <strong>berhasil diverifikasi</strong>!</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3 style="margin: 0 0 10px 0; color: #15803d;">📋 Detail Pembayaran:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Nama:</strong> ${data.tenant_name}</li>
                <li><strong>Bulan:</strong> ${data.month}</li>
                ${data.room_number ? `<li><strong>Kamar:</strong> ${data.room_number}</li>` : ''}
                <li><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">LUNAS ✅</span></li>
              </ul>
            </div>

            ${data.admin_notes ? `
              <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>📝 Catatan Admin:</strong><br>${data.admin_notes}
              </div>
            ` : ''}

            <p>🎉 Terima kasih atas pembayaran tepat waktu!</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <div style="text-align: center; color: #64748b; font-size: 14px;">
              <strong>Kost Pak Trisno</strong><br>
              📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya<br>
              📱 Admin: +6281234567890
            </div>
          </div>
        </div>
      `,
      text: `✅ PEMBAYARAN DITERIMA\n\nHalo ${data.tenant_name},\n\nPembayaran berhasil diverifikasi!\n\nDetail:\n• Nama: ${data.tenant_name}\n• Bulan: ${data.month}\n${data.room_number ? `• Kamar: ${data.room_number}\n` : ''}• Status: LUNAS ✅\n\n${data.admin_notes ? `Catatan: ${data.admin_notes}\n\n` : ''}Terima kasih!\n\nKost Pak Trisno\n📱 +6281234567890`
    },
    
    payment_rejected: {
      subject: '❌ Pembayaran Ditolak - Kost Pak Trisno',
      html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #dc2626; margin-bottom: 20px;">❌ Pembayaran Ditolak</h2>
            <p>Halo <strong>${data.tenant_name}</strong>,</p>
            <p>Maaf, pembayaran Anda <strong>belum dapat kami terima</strong>.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin: 0 0 10px 0; color: #b91c1c;">📋 Detail:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Nama:</strong> ${data.tenant_name}</li>
                <li><strong>Bulan:</strong> ${data.month}</li>
                <li><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">DITOLAK ❌</span></li>
              </ul>
            </div>

            ${data.admin_notes ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>📝 Alasan:</strong><br>${data.admin_notes}
              </div>
            ` : ''}

            <div style="background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">🔄 Langkah Selanjutnya:</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Pastikan bukti transfer jelas</li>
                <li>Cek nominal sesuai tagihan</li>
                <li>Upload ulang via website</li>
                <li>Atau hubungi admin: +6281234567890</li>
              </ol>
            </div>
          </div>
        </div>
      `,
      text: `❌ PEMBAYARAN DITOLAK\n\nHalo ${data.tenant_name},\n\nMaaf, pembayaran ditolak.\n\n${data.admin_notes ? `Alasan: ${data.admin_notes}\n\n` : ''}Langkah selanjutnya:\n1. Pastikan bukti jelas\n2. Cek nominal\n3. Upload ulang\n4. Hubungi admin: +6281234567890`
    },
    
    payment_submitted: {
      subject: '📄 Bukti Transfer Diterima - Kost Pak Trisno',
      html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #0ea5e9; margin-bottom: 20px;">📄 Bukti Transfer Diterima</h2>
            <p>Halo <strong>${data.tenant_name}</strong>,</p>
            <p>Bukti transfer Anda telah <strong>berhasil diterima</strong> dan sedang diproses.</p>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
              <h3 style="margin: 0 0 10px 0; color: #0284c7;">📋 Detail Upload:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Nama:</strong> ${data.tenant_name}</li>
                <li><strong>Bulan:</strong> ${data.month}</li>
                ${data.room_number ? `<li><strong>Kamar:</strong> ${data.room_number}</li>` : ''}
                <li><strong>Status:</strong> <span style="color: #f59e0b;">PENDING ⏳</span></li>
              </ul>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>⏰ Proses Verifikasi:</strong></p>
              <p style="margin: 10px 0 0 0;">Admin akan memverifikasi dalam 1x24 jam. Anda akan dapat notifikasi setelah verifikasi selesai.</p>
            </div>

            <p>📞 Pertanyaan? Hubungi admin: <strong>+6281234567890</strong></p>
          </div>
        </div>
      `,
      text: `📄 BUKTI TRANSFER DITERIMA\n\nHalo ${data.tenant_name},\n\nBukti transfer berhasil diterima!\n\nDetail:\n• Nama: ${data.tenant_name}\n• Bulan: ${data.month}\n• Status: PENDING ⏳\n\nAdmin akan verifikasi dalam 1x24 jam.\n\nPertanyaan? Hubungi: +6281234567890`
    }
  }

  return templates[type] || templates.payment_submitted
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('📧 Brevo Email API called')

  try {
    // Check API key
    if (!process.env.BREVO_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'BREVO_API_KEY not configured'
      })
    }

    const { to, type, data, subject, html, text } = req.body

    // Validate email
    if (!to || !to.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
        received: { to }
      })
    }

    console.log(`📧 Sending to: ${to}`)

    let emailContent

    // Get email content
    if (type && data) {
      emailContent = getEmailTemplate(type, data)
    } else if (subject && (html || text)) {
      emailContent = { subject, html, text }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      })
    }

    // Prepare Brevo email
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
    
    sendSmtpEmail.sender = {
      name: process.env.EMAIL_FROM_NAME || 'Kost Pak Trisno',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@yourdomain.com'
    }
    
    sendSmtpEmail.to = [{ email: to }]
    sendSmtpEmail.subject = emailContent.subject
    sendSmtpEmail.htmlContent = emailContent.html
    sendSmtpEmail.textContent = emailContent.text

    // Send via Brevo
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail)

    console.log('✅ Brevo email sent:', result.messageId)

    return res.status(200).json({
      success: true,
      emailId: result.messageId,
      to: to,
      from: sendSmtpEmail.sender.email,
      subject: emailContent.subject,
      provider: 'Brevo',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Brevo error:', error)

    // Parse Brevo specific errors
    let errorMessage = error.message || 'Failed to send email'
    let errorDetails = {}

    if (error.response?.body?.message) {
      errorMessage = error.response.body.message
    }

    if (errorMessage.includes('Invalid API key')) {
      errorDetails = {
        solution: 'Check BREVO_API_KEY in environment variables',
        link: 'https://app.brevo.com/settings/keys/api'
      }
    } else if (errorMessage.includes('sender email')) {
      errorDetails = {
        solution: 'Verify sender email in Brevo dashboard',
        link: 'https://app.brevo.com/senders'
      }
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    })
  }
}


// ========================================
// FILE 2: pages/api/verify-payment-brevo.js
// ========================================

import { createClient } from '@supabase/supabase-js'
import Twilio from 'twilio'
import SibApiV3Sdk from 'sib-api-v3-sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceKey)

export const config = {
  maxDuration: 30,
}

// Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

// Brevo client
let brevoApiInstance = null
if (process.env.BREVO_API_KEY) {
  const defaultClient = SibApiV3Sdk.ApiClient.instance
  const apiKey = defaultClient.authentications['api-key']
  apiKey.apiKey = process.env.BREVO_API_KEY
  brevoApiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
}

// Phone formatter
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

// WhatsApp sender
async function sendWhatsAppDirect(phone, message) {
  try {
    if (!twilioClient) {
      return { success: false, error: 'WhatsApp not configured' }
    }

    const formattedPhone = formatPhoneNumber(phone)
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone number' }
    }

    console.log('📱 Sending WhatsApp via Twilio')

    const result = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${formattedPhone}`,
      body: message
    })

    console.log('✅ WhatsApp sent:', result.sid)
    return { success: true, sid: result.sid, phone: formattedPhone }
    
  } catch (error) {
    console.error('❌ WhatsApp error:', error)
    return { success: false, error: error.message }
  }
}

// Email templates
function getEmailTemplate(type, data) {
  const templates = {
    payment_accepted: {
      subject: '✅ Pembayaran Diterima - Kost Pak Trisno',
      html: `<h2>✅ Pembayaran Diterima</h2><p>Halo <strong>${data.tenant_name}</strong>,</p><p>Pembayaran untuk bulan <strong>${data.month}</strong> telah diterima!</p>`,
      text: `✅ Pembayaran Diterima\n\nHalo ${data.tenant_name},\n\nPembayaran bulan ${data.month} telah diterima!`
    },
    payment_rejected: {
      subject: '❌ Pembayaran Ditolak - Kost Pak Trisno',
      html: `<h2>❌ Pembayaran Ditolak</h2><p>Halo <strong>${data.tenant_name}</strong>,</p><p>Pembayaran ditolak. ${data.admin_notes || ''}</p>`,
      text: `❌ Pembayaran Ditolak\n\nHalo ${data.tenant_name},\n\n${data.admin_notes || 'Silakan hubungi admin.'}`
    }
  }
  return templates[type]
}

// Email sender via Brevo
async function sendEmailDirect(email, type, paymentData) {
  try {
    if (!brevoApiInstance) {
      return { success: false, error: 'Email service not configured' }
    }

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email' }
    }

    console.log('📧 Sending email via Brevo')

    const template = getEmailTemplate(type, paymentData)
    if (!template) {
      return { success: false, error: 'Unknown template type' }
    }

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
    sendSmtpEmail.sender = {
      name: process.env.EMAIL_FROM_NAME || 'Kost Pak Trisno',
      email: process.env.BREVO_SENDER_EMAIL
    }
    sendSmtpEmail.to = [{ email: email }]
    sendSmtpEmail.subject = template.subject
    sendSmtpEmail.htmlContent = template.html
    sendSmtpEmail.textContent = template.text

    const result = await brevoApiInstance.sendTransacEmail(sendSmtpEmail)

    console.log('✅ Email sent:', result.messageId)
    return { success: true, emailId: result.messageId, email: email }
    
  } catch (error) {
    console.error('❌ Email error:', error)
    return { success: false, error: error.message }
  }
}

// Get tenant email
async function getTenantEmail(payment) {
  try {
    if (payment.email && payment.email.includes('@')) {
      return payment.email
    }
    
    if (payment.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('email')
        .eq('id', payment.tenant_id)
        .single()
      
      if (tenant?.email) return tenant.email
    }
    
    if (payment.phone) {
      const { data: tenantByPhone } = await supabase
        .from('tenants')
        .select('email')
        .eq('phone', payment.phone)
        .single()
      
      if (tenantByPhone?.email) return tenantByPhone.email
    }
    
    return null
  } catch (error) {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('🚀 Verify Payment API (Brevo) called')
  const startTime = Date.now()
  const { id, action, admin_notes } = req.body

  if (!id || !action || !['success', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  try {
    // Get payment
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    console.log('✅ Payment found:', payment.tenant_name)

    // Update status
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
      return res.status(500).json({ error: 'Update failed' })
    }

    console.log('✅ Status updated to:', newStatus)

    // Prepare notification data
    const notificationData = {
      tenant_name: payment.tenant_name,
      month: payment.month,
      room_number: payment.room_number,
      phone: payment.phone,
      admin_notes: admin_notes
    }

    const tenantEmail = await getTenantEmail(payment)

    // Notifications tracking
    const notifications = {
      whatsapp: { success: false, error: 'Not attempted' },
      email: { success: false, error: 'Not attempted' }
    }

    // WhatsApp message
    const whatsappMessage = action === 'success'
      ? `✅ *PEMBAYARAN DITERIMA*\n\nHalo ${payment.tenant_name}!\n\nPembayaran bulan ${payment.month} telah diverifikasi.\n\n✅ Status: LUNAS\n\nTerima kasih!\n\n---\n*Kost Pak Trisno*\n📱 +6281234567890`
      : `❌ *PEMBAYARAN DITOLAK*\n\nHalo ${payment.tenant_name},\n\nPembayaran ditolak.\n\n${admin_notes ? `Alasan: ${admin_notes}\n\n` : ''}Hubungi admin: +6281234567890`

    // Send notifications with timeout
    const notificationPromises = []

    if (payment.phone) {
      const whatsappPromise = Promise.race([
        sendWhatsAppDirect(payment.phone, whatsappMessage),
        new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'Timeout' }), 15000))
      ])
      notificationPromises.push(
        whatsappPromise.then(result => { notifications.whatsapp = result })
      )
    }

    if (tenantEmail) {
      const emailType = action === 'success' ? 'payment_accepted' : 'payment_rejected'
      const emailPromise = Promise.race([
        sendEmailDirect(tenantEmail, emailType, notificationData),
        new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'Timeout' }), 10000))
      ])
      notificationPromises.push(
        emailPromise.then(result => { notifications.email = result })
      )
    }

    await Promise.allSettled(notificationPromises)

    const executionTime = Date.now() - startTime
    const successCount = [notifications.whatsapp.success, notifications.email.success].filter(Boolean).length
    const totalAttempted = notificationPromises.length

    let message = `✅ Payment ${newStatus}ed! (${executionTime}ms)`
    
    if (successCount === totalAttempted && totalAttempted > 0) {
      message += `\n\n🎉 All notifications sent!`
    } else if (successCount > 0) {
      message += `\n\n⚠️ Partial success: ${successCount}/${totalAttempted} sent`
    }

    return res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        tenant_name: payment.tenant_name,
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
        executionTime: `${executionTime}ms`
      },
      message: message
    })

  } catch (error) {
    console.error('💥 Error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
