// pages/api/whatsapp-webhook.js
/**
 * Webhook untuk menerima balasan WhatsApp dari customer
 * Twilio akan POST ke endpoint ini ketika customer reply WhatsApp
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse Twilio webhook payload
    const {
      From,           // whatsapp:+6281234567890
      To,             // whatsapp:+14155238886
      Body,           // Message content
      MessageSid,     // Unique message ID
      AccountSid,
      ProfileName     // Sender's WhatsApp name
    } = req.body

    // Remove whatsapp: prefix
    const fromPhone = From?.replace('whatsapp:', '')
    const toPhone = To?.replace('whatsapp:', '')
    
    console.log('WhatsApp message received:', {
      from: fromPhone,
      to: toPhone,
      body: Body,
      profileName: ProfileName,
      messageSid: MessageSid
    })

    // Auto-reply untuk customer
    let reply = ''
    const messageBody = Body?.toLowerCase() || ''
    
    if (messageBody.includes('info') || messageBody.includes('bantuan') || messageBody.includes('help')) {
      reply = `🏠 *Kost Pak Trisno - Info*

Halo ${ProfileName || 'Customer'}! 👋

📋 *Menu Bantuan:*
• *KAMAR* - Info kamar tersedia
• *BAYAR* - Cara pembayaran
• *LOKASI* - Alamat lengkap
• *KONTAK* - Hubungi admin

🌐 Website: ${process.env.NEXT_PUBLIC_APP_URL || 'https://kostpaktrisno.vercel.app'}

Ketik salah satu menu di atas untuk info lebih lanjut.`
    }
    else if (messageBody.includes('kamar')) {
      reply = `🏠 *Info Kamar Tersedia*

💰 *Harga:* Mulai Rp 550.000/bulan

🛏️ *Fasilitas Pribadi:*
• Kasur + bantal guling
• Kipas angin/AC
• Lemari pakaian
• Meja belajar + kursi
• Listrik & air

🏢 *Fasilitas Umum:*
• Dapur bersama
• Kamar mandi luar
• Area jemuran
• WiFi unlimited

📱 *Cek ketersediaan:* ${process.env.NEXT_PUBLIC_APP_URL || 'https://kostpaktrisno.vercel.app'}`
    }
    else if (messageBody.includes('bayar')) {
      reply = `💳 *Cara Pembayaran*

🏦 *Transfer Bank:*
BCA: 1234567890
BRI: 0987654321
A/n: Pak Trisno

📱 *Upload Bukti:*
${process.env.NEXT_PUBLIC_APP_URL || 'https://kostpaktrisno.vercel.app'}/payment

⚡ *Proses:*
1. Transfer sesuai tagihan
2. Upload bukti via website
3. Tunggu konfirmasi admin
4. Selesai!

*Pembayaran paling lambat tanggal 5 setiap bulan*`
    }
    else if (messageBody.includes('lokasi')) {
      reply = `📍 *Alamat Lengkap*

🏠 Kost Pak Trisno
Dharma Husada Indah Utara
Mulyorejo Tengah Gg. V No.21 
(Depan U-416)
Mulyorejo, Surabaya
Jawa Timur 60115

🗺️ *Google Maps:*
https://maps.app.goo.gl/xyz (sesuaikan dengan maps real)

🚗 *Akses:*
• 5 menit ke kampus terdekat
• Dekat pusat perbelanjaan
• Transportasi umum mudah`
    }
    else if (messageBody.includes('kontak')) {
      reply = `📞 *Kontak Admin*

👨‍💼 *Pak Trisno (Owner)*
📱 WhatsApp: +6281234567890
📧 Email: admin@kostpaktrisno.com

⏰ *Jam Operasional:*
Senin - Minggu: 08:00 - 21:00

🌐 *Website:*
${process.env.NEXT_PUBLIC_APP_URL || 'https://kostpaktrisno.vercel.app'}

*Untuk emergency di luar jam kerja, tetap bisa WhatsApp*`
    }
    else if (messageBody.includes('halo') || messageBody.includes('hai') || messageBody.includes('hello')) {
      reply = `👋 Halo ${ProfileName || 'Customer'}!

Selamat datang di *Kost Pak Trisno* 🏠

Ketik *INFO* untuk menu bantuan lengkap.

Ada yang bisa saya bantu? 😊`
    }
    else {
      reply = `Terima kasih atas pesan Anda! 🙏

Untuk bantuan, ketik *INFO* untuk menu lengkap.

Atau langsung hubungi admin: +6281234567890 📱`
    }

    // Log untuk admin monitoring (bisa disimpan ke database)
    console.log('Auto-reply sent:', reply)

    // Response ke Twilio dengan TwiML
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${reply}</Message>
</Response>`

    // Set content type untuk TwiML
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(twimlResponse)
    
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    
    // Fallback response
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Maaf, terjadi kesalahan sistem. Silakan hubungi admin langsung di +6281234567890</Message>
</Response>`
    
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(errorResponse)
  }
}
