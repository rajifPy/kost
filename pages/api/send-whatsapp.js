import Twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM

const msg = await client.messages.create({
  from: process.env.TWILIO_WHATSAPP_FROM,
  to: `whatsapp:${phone}`,
  body: 'Pembayaran diterima...',
  statusCallback: `${process.env.BASE_URL}/api/whatsapp-status`
});

// ✅ Validasi konfigurasi
if (!accountSid || !authToken || !whatsappFrom) {
  console.error('❌ Twilio not configured. Check environment variables.')
}

const client = accountSid && authToken ? Twilio(accountSid, authToken) : null

// ✅ Fungsi format nomor telepon Indonesia
function formatPhoneNumber(phone) {
  if (!phone) return null
  
  // Remove spaces, dashes, dots
  let cleaned = phone.replace(/[\s\-\.]/g, '')
  
  // Handle Indonesian numbers
  if (cleaned.startsWith('08')) {
    return '+62' + cleaned.substring(1) // 08123456789 -> +6281234567890
  } else if (cleaned.startsWith('62')) {
    return '+' + cleaned // 6281234567890 -> +6281234567890  
  } else if (cleaned.startsWith('+62')) {
    return cleaned // +6281234567890 -> +6281234567890
  } else if (!cleaned.startsWith('+')) {
    // Assume Indonesian if no country code
    return '+62' + cleaned // 81234567890 -> +6281234567890
  }
  
  return cleaned
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, message } = req.body

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing phone number or message' })
  }

  if (!client) {
    return res.status(500).json({ 
      error: 'Twilio not configured',
      details: 'Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in environment'
    })
  }

  try {
    const formattedPhone = formatPhoneNumber(to)
    
    if (!formattedPhone) {
      return res.status(400).json({ error: 'Invalid phone number format' })
    }

    console.log(`📱 Sending WhatsApp: ${whatsappFrom} -> ${formattedPhone}`)

    const result = await client.messages.create({
      from: `whatsapp:${whatsappFrom}`,
      to: `whatsapp:${formattedPhone}`,
      body: message
    })

    console.log('✅ WhatsApp sent successfully:', result.sid)
    return res.status(200).json({ 
      success: true, 
      sid: result.sid,
      to: formattedPhone 
    })

  } catch (error) {
    console.error('❌ WhatsApp send error:', error)
    
    // Handle specific Twilio errors
    if (error.code === 21211) {
      return res.status(400).json({ 
        error: 'Invalid phone number', 
        details: 'Phone number is not valid or not WhatsApp-enabled' 
      })
    } else if (error.code === 63016) {
      return res.status(400).json({ 
        error: 'WhatsApp not joined sandbox', 
        details: 'Recipient must join WhatsApp sandbox first' 
      })
    } else if (error.code === 21408) {
      return res.status(403).json({ 
        error: 'Permission denied', 
        details: 'Check if WhatsApp sender is approved' 
      })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Failed to send WhatsApp',
      code: error.code
    })
  }
}
