// pages/api/verify-payment.js - Updated with Gmail SMTP
import { createClient } from '@supabase/supabase-js'
import Twilio from 'twilio'
import nodemailer from 'nodemailer'

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

// Gmail SMTP transporter
let emailTransporter = null
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })
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
  const baseStyle = `font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;`
  const cardStyle = `background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);`

  const templates = {
    payment_accepted: {
      subject: '✅ Pembayaran Diterima - Kost Pak Trisno',
      html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #16a34a;">✅ Pembayaran Berhasil Diterima</h2>
            <p>Halo <strong>${data.tenant_name}</strong>,</p>
            <p>Pembayaran Anda telah <strong>berhasil diverifikasi</strong>!</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3>📋 Detail Pembayaran:</h3>
              <ul>
                <li><strong>Nama:</strong> ${data.tenant_name}</li>
                <li><strong>Bulan:</strong> ${data.month}</li>
                ${data.room_number ? `<li><strong>Kamar:</strong> ${data.room_number}</li>` : ''}
                <li><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">LUNAS ✅</span></li>
              </ul>
            </div>

            ${data.admin_notes ? `
              <div style="background: #eff6ff; padding: 15px; border-radius: 6px;">
                <strong>📝 Catatan:</strong><br>${data.admin_notes}
              </div>
            ` : ''}

            <p>🎉 Terima kasih!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center; color: #666; font-size: 14px;">
              <strong>Kost Pak Trisno</strong><br>
              📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya<br>
              📱 Admin: +6281234567890
            </div>
          </div>
        </div>
      `
    },
    payment_rejected: {
      subject: '❌ Pembayaran Ditolak - Kost Pak Trisno',
      html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #dc2626;">❌ Pembayaran Ditolak</h2>
            <p>Halo <strong>${data.tenant_name}</strong>,</p>
            <p>Maaf, pembayaran <strong>belum dapat kami terima</strong>.</p>
            
            ${data.admin_notes ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>📝 Alasan:</strong><br>${data.admin_notes}
              </div>
            ` : ''}

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px;">
              <h3>🔄 Langkah Selanjutnya:</h3>
              <ol>
                <li>Pastikan bukti transfer jelas</li>
                <li>Cek nominal sesuai tagihan</li>
                <li>Upload ulang via website</li>
                <li>Atau hubungi admin</li>
              </ol>
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center; color: #666; font-size: 14px;">
              <strong>Kost Pak Trisno</strong><br>
              📱 Admin: +6281234567890
            </div>
          </div>
        </div>
      `
    }
  }
  return templates[type]
}

// Email sender via Gmail SMTP
async function sendEmailDirect(email, type, paymentData) {
  try {
    if (!emailTransporter) {
      return { success: false, error: 'Email service not configured' }
    }

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email' }
    }

    console.log('📧 Sending email via Gmail SMTP')

    const template = getEmailTemplate(type, paymentData)
    if (!template) {
      return { success: false, error: 'Unknown template type' }
    }

    const info = await emailTransporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Kost Pak Trisno'}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: template.subject,
      html: template.html
    })

    console.log('✅ Email sent:', info.messageId)
    return { success: true, messageId: info.messageId, email: email }
    
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

  console.log('🚀 Verify Payment API called (Gmail SMTP)')
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
