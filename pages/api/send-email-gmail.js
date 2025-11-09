// pages/api/send-email-gmail.js
// GRATIS - Gmail SMTP (3000 email/hari untuk personal Gmail)
import nodemailer from 'nodemailer'

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // your-email@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD // App Password dari Google
  }
})

// Email templates
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

  console.log('📧 Gmail SMTP Email API called')

  try {
    // Check configuration
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({
        success: false,
        error: 'Gmail SMTP not configured',
        help: 'Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables'
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

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Kost Pak Trisno'}" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    })

    console.log('✅ Gmail email sent:', info.messageId)

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      to: to,
      from: process.env.GMAIL_USER,
      subject: emailContent.subject,
      provider: 'Gmail SMTP',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Gmail SMTP error:', error)

    let errorMessage = error.message || 'Failed to send email'
    let errorDetails = {}

    if (errorMessage.includes('Invalid login')) {
      errorDetails = {
        solution: 'Check Gmail credentials or enable App Password',
        link: 'https://myaccount.google.com/apppasswords'
      }
    } else if (errorMessage.includes('self signed certificate')) {
      errorDetails = {
        solution: 'Network/SSL issue. Try: NODE_TLS_REJECT_UNAUTHORIZED=0'
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
