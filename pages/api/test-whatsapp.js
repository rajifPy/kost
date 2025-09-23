// pages/api/test-whatsapp.js - Debug WhatsApp configuration
export default async function handler(req, res) {
  console.log('🧪 WhatsApp Test API called')
  
  // Check configuration
  const config = {
    hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    hasWhatsAppFrom: !!process.env.TWILIO_WHATSAPP_FROM,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'Not configured',
    environment: process.env.NODE_ENV || 'unknown',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set'
  }
  
  console.log('📋 Configuration check:', config)
  
  if (req.method === 'GET') {
    // Just return configuration
    return res.status(200).json({
      message: 'WhatsApp Test API',
      configuration: config,
      isConfigured: config.hasAccountSid && config.hasAuthToken && config.hasWhatsAppFrom,
      usage: {
        get: 'Check configuration',
        post: 'Send test WhatsApp message',
        body: { phone: '+6281234567890', message: 'Test message' }
      }
    })
  }
  
  if (req.method === 'POST') {
    try {
      const { phone, message } = req.body
      const testPhone = phone || '+6281460326800' // Default to ALFIN's number from screenshot
      const testMessage = message || '🧪 Test WhatsApp dari Kost App - ' + new Date().toLocaleString('id-ID')
      
      console.log(`📱 Testing WhatsApp to: ${testPhone}`)
      
      // Check if configured
      if (!config.hasAccountSid || !config.hasAuthToken || !config.hasWhatsAppFrom) {
        return res.status(500).json({
          success: false,
          error: 'WhatsApp not configured',
          configuration: config,
          missingVars: {
            TWILIO_ACCOUNT_SID: !config.hasAccountSid,
            TWILIO_AUTH_TOKEN: !config.hasAuthToken,
            TWILIO_WHATSAPP_FROM: !config.hasWhatsAppFrom
          }
        })
      }
      
      // Call the WhatsApp API
      const baseUrl = req.headers.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const apiUrl = `${baseUrl}/api/send-whatsapp`
      
      console.log('🔄 Calling WhatsApp API:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'KostApp-Test/1.0'
        },
        body: JSON.stringify({
          to: testPhone,
          message: testMessage
        })
      })
      
      const result = await response.json()
      console.log('📱 WhatsApp API response:', result)
      
      return res.status(response.status).json({
        success: response.ok,
        testData: {
          phone: testPhone,
          message: testMessage,
          timestamp: new Date().toISOString()
        },
        configuration: config,
        apiResponse: result,
        httpStatus: response.status
      })
      
    } catch (error) {
      console.error('💥 Test error:', error)
      return res.status(500).json({
        success: false,
        error: error.message,
        configuration: config,
        timestamp: new Date().toISOString()
      })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' })
}
