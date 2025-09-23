// pages/api/send-email.js
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Email templates
const getEmailTemplate = (type, data) => {
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

  switch (type) {
    case 'payment_accepted':
      return {
        subject: '✅ Pembayaran Diterima - Kost Pak Trisno',
        html: `
          <div style="${baseStyle}">
            <div style="${cardStyle}">
              <h2 style="color: #16a34a; margin-bottom: 20px;">✅ Pembayaran Berhasil Diterima</h2>
              
              <p>Halo <strong>${data.tenant_name}</strong>,</p>
              
              <p>Kabar baik! Pembayaran Anda telah <strong>berhasil diverifikasi</strong> dan diterima oleh sistem kami.</p>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #16a34a;">
                <h3 style="margin: 0 0 10px 0; color: #15803d;">📋 Detail Pembayaran:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><strong>Nama:</strong> ${data.tenant_name}</li>
                  <li><strong>Bulan:</strong> ${data.month}</li>
                  ${data.room_number ? `<li><strong>Kamar:</strong> ${data.room_number}</li>` : ''}
                  <li><strong>Phone:</strong> ${data.phone}</li>
                  <li><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">LUNAS ✅</span></li>
                </ul>
              </div>

              ${data.admin_notes ? `
                <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                  <strong>📝 Catatan Admin:</strong><br>
                  ${data.admin_notes}
                </div>
              ` : ''}

              <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0;"><strong>🎉 Terima kasih atas pembayaran tepat waktu!</strong></p>
                <p style="margin: 10px 0 0 0; color: #64748b;">Anda dapat melanjutkan tinggal dengan tenang di Kost Pak Trisno.</p>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <div style="text-align: center; color: #64748b; font-size: 14px;">
                <p><strong>Kost Pak Trisno</strong><br>
                📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya<br>
                📱 Admin: +6281234567890<br>
                🌐 Website: ${process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app'}</p>
              </div>
            </div>
          </div>
        `,
        text: `
✅ PEMBAYARAN DITERIMA - Kost Pak Trisno

Halo ${data.tenant_name},

Pembayaran Anda telah berhasil diverifikasi!

Detail Pembayaran:
• Nama: ${data.tenant_name}
• Bulan: ${data.month}
${data.room_number ? `• Kamar: ${data.room_number}\n` : ''}• Phone: ${data.phone}
• Status: LUNAS ✅

${data.admin_notes ? `\nCatatan Admin: ${data.admin_notes}\n` : ''}

Terima kasih atas pembayaran tepat waktu!

---
Kost Pak Trisno
📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya
📱 Admin: +6281234567890
🌐 ${process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app'}
        `
      }

    case 'payment_rejected':
      return {
        subject: '❌ Pembayaran Ditolak - Kost Pak Trisno',
        html: `
          <div style="${baseStyle}">
            <div style="${cardStyle}">
              <h2 style="color: #dc2626; margin-bottom: 20px;">❌ Pembayaran Ditolak</h2>
              
              <p>Halo <strong>${data.tenant_name}</strong>,</p>
              
              <p>Maaf, pembayaran yang Anda submit <strong>belum dapat kami terima</strong> karena beberapa alasan.</p>
              
              <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <h3 style="margin: 0 0 10px 0; color: #b91c1c;">📋 Detail Pembayaran:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><strong>Nama:</strong> ${data.tenant_name}</li>
                  <li><strong>Bulan:</strong> ${data.month}</li>
                  ${data.room_number ? `<li><strong>Kamar:</strong> ${data.room_number}</li>` : ''}
                  <li><strong>Phone:</strong> ${data.phone}</li>
                  <li><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">DITOLAK ❌</span></li>
                </ul>
              </div>

              ${data.admin_notes ? `
                <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <strong>📝 Alasan Penolakan:</strong><br>
                  ${data.admin_notes}
                </div>
              ` : ''}

              <div style="background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
                <h3 style="margin: 0 0 10px 0; color: #0284c7;">🔄 Langkah Selanjutnya:</h3>
                <ol style="margin: 0; padding-left: 20px;">
                  <li>Pastikan bukti transfer jelas dan terbaca</li>
                  <li>Cek kembali nominal transfer sesuai tagihan</li>
                  <li>Upload ulang bukti via website: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app'}/payment" style="color: #0ea5e9;">Upload Bukti</a></li>
                  <li>Atau hubungi admin langsung untuk klarifikasi</li>
                </ol>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <div style="text-align: center; color: #64748b; font-size: 14px;">
                <p><strong>Kost Pak Trisno</strong><br>
                📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya<br>
                📱 Admin: +6281234567890<br>
                🌐 Website: ${process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app'}</p>
              </div>
            </div>
          </div>
        `,
        text: `
❌ PEMBAYARAN DITOLAK - Kost Pak Trisno

Halo ${data.tenant_name},

Maaf, pembayaran Anda belum dapat kami terima.

Detail Pembayaran:
• Nama: ${data.tenant_name}
• Bulan: ${data.month}
${data.room_number ? `• Kamar: ${data.room_number}\n` : ''}• Phone: ${data.phone}
• Status: DITOLAK ❌

${data.admin_notes ? `\nAlasan Penolakan: ${data.admin_notes}\n` : ''}

Langkah Selanjutnya:
1. Pastikan bukti transfer jelas dan terbaca
2. Cek nominal transfer sesuai tagihan  
3. Upload ulang via: ${process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app'}/payment
4. Atau hubungi admin: +6281234567890

---
Kost Pak Trisno
📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya
📱 Admin: +6281234567890
        `
      }

    case 'payment_submitted':
      return {
        subject: '📄 Bukti Transfer Diterima - Kost Pak Trisno',
        html: `
          <div style="${baseStyle}">
            <div style="${cardStyle}">
              <h2 style="color: #0ea5e9; margin-bottom: 20px;">📄 Bukti Transfer Berhasil Diterima</h2>
              
              <p>Halo <strong>${data.tenant_name}</strong>,</p>
              
              <p>Terima kasih! Bukti transfer Anda telah <strong>berhasil diterima</strong> dan sedang dalam proses verifikasi.</p>
              
              <div style="background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
                <h3 style="margin: 0 0 10px 0; color: #0284c7;">📋 Detail Upload:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><strong>Nama:</strong> ${data.tenant_name}</li>
                  <li><strong>Bulan:</strong> ${data.month}</li>
                  ${data.room_number ? `<li><strong>Kamar:</strong> ${data.room_number}</li>` : ''}
                  <li><strong>Phone:</strong> ${data.phone}</li>
                  <li><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">PENDING ⏳</span></li>
                  <li><strong>Waktu Upload:</strong> ${new Date().toLocaleString('id-ID')}</li>
                </ul>
              </div>

              <div style="background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #92400e;">⏳ Proses Selanjutnya:</h3>
                <p style="margin: 0;">Admin akan memverifikasi pembayaran Anda dalam <strong>1x24 jam</strong>. Anda akan mendapat notifikasi email dan WhatsApp setelah verifikasi selesai.</p>
              </div>

              <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📞 Butuh bantuan?</strong></p>
                <p style="margin: 10px 0 0 0;">Jika ada pertanyaan atau urgent, hubungi admin langsung di <strong>+6281234567890</strong></p>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <div style="text-align: center; color: #64748b; font-size: 14px;">
                <p><strong>Kost Pak Trisno</strong><br>
                📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya<br>
                📱 Admin: +6281234567890<br>
                🌐 Website: ${process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app'}</p>
              </div>
            </div>
          </div>
        `,
        text: `
📄 BUKTI TRANSFER DITERIMA - Kost Pak Trisno

Halo ${data.tenant_name},

Bukti transfer Anda berhasil diterima dan sedang dalam proses verifikasi.

Detail Upload:
• Nama: ${data.tenant_name}
• Bulan: ${data.month}
${data.room_number ? `• Kamar: ${data.room_number}\n` : ''}• Phone: ${data.phone}
• Status: PENDING ⏳
• Waktu Upload: ${new Date().toLocaleString('id-ID')}

Proses Selanjutnya:
Admin akan memverifikasi dalam 1x24 jam. Anda akan mendapat notifikasi setelah verifikasi selesai.

Butuh bantuan? Hubungi admin: +6281234567890

---
Kost Pak Trisno
📍 Dharma Husada Indah Utara, Mulyorejo, Surabaya
📱 Admin: +6281234567890
        `
      }

    default:
      throw new Error(`Unknown email template type: ${type}`)
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
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('📧 Send Email API called')
  
  try {
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured')
      return res.status(500).json({
        success: false,
        error: 'Email service not configured',
        details: 'RESEND_API_KEY missing in environment variables'
      })
    }

    const { to, type, data, subject, html, text } = req.body

    // Validation
    if (!to || !to.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
        received: { to }
      })
    }

    console.log(`📧 Sending email to: ${to}`)

    let emailContent

    if (type && data) {
      // Template-based email
      console.log(`📋 Using template: ${type}`)
      emailContent = getEmailTemplate(type, data)
    } else if (subject && (html || text)) {
      // Custom email
      console.log('📋 Using custom content')
      emailContent = { subject, html, text }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        required: 'Either (type + data) or (subject + html/text)'
      })
    }

    // Email configuration
    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'
    const fromName = process.env.EMAIL_FROM_NAME || 'Kost Pak Trisno'
    const from = `${fromName} <${fromEmail}>`

    console.log(`📤 Sending from: ${from}`)

    // Send email via Resend
    const result = await resend.emails.send({
      from: from,
      to: [to],
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    })

    console.log('✅ Email sent successfully:', result.data?.id)

    return res.status(200).json({
      success: true,
      emailId: result.data?.id,
      to: to,
      subject: emailContent.subject,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Email send error:', error)
    
    // Handle specific Resend errors
    if (error.message?.includes('API key')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        details: 'Check RESEND_API_KEY in environment variables'
      })
    } else if (error.message?.includes('domain')) {
      return res.status(400).json({
        success: false,
        error: 'Domain not verified',
        details: 'Verify your domain in Resend dashboard'
      })
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
      timestamp: new Date().toISOString()
    })
  }
}
