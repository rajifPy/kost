// pages/api/whatsapp-status.js
/**
 * Endpoint untuk menerima status delivery WhatsApp
 * Twilio akan GET ke endpoint ini untuk update status pesan
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      MessageSid,
      MessageStatus,  // sent, delivered, read, failed, undelivered
      To,
      From,
      AccountSid,
      ErrorCode,
      ErrorMessage
    } = req.query

    console.log('WhatsApp status update:', {
      messageSid: MessageSid,
      status: MessageStatus,
      to: To,
      from: From,
      error: ErrorCode ? `${ErrorCode}: ${ErrorMessage}` : null
    })

    // Optional: Save status to database for monitoring
    // await supabase.from('message_logs').insert({
    //   message_sid: MessageSid,
    //   status: MessageStatus,
    //   recipient: To,
    //   error_code: ErrorCode,
    //   error_message: ErrorMessage,
    //   timestamp: new Date().toISOString()
    // })

    return res.status(200).json({ 
      ok: true, 
      message: 'Status received',
      data: {
        messageSid: MessageSid,
        status: MessageStatus
      }
    })
    
  } catch (error) {
    console.error('WhatsApp status callback error:', error)
    return res.status(500).json({ error: error.message })
  }
}
