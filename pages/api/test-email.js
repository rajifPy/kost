// pages/api/test-email.js - Debug Email configuration
export default async function handler(req, res) {
  console.log('📧 Email Test API called')
  
  // Check configuration
  const config = {
    hasResendKey: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    emailFromName: process.env.EMAIL_FROM_NAME || 'Kost Pak Trisno',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@kostpaktrisno.com',
    environment: process.env.NODE_ENV || 'unknown',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set'
  }
  
  console.log('📋 Email configuration check:', config)
  
  if (req.method === 'GET') {
    // Just return configuration
    return res.status(200).json({
      message: 'Email Test API',
      configuration: config,
      isConfigured: config.hasResendKey,
      usage: {
        get: 'Check configuration',
        post: 'Send test email',
        body: { 
          to: 'test@example.com', 
          type: 'payment_accepted|payment_rejected|payment_submitted',
          data: { tenant_name: 'Test User', month: '2025-09', room_number: 'KM1' }
        }
      },
      availableTemplates: [
        'payment_accepted - Email konfirmasi pembayaran diterima',
        'payment_rejected - Email notifikasi pembayaran ditolak', 
        'payment_submitted - Email konfirmasi upload bukti transfer'
      ]
    })
  }
  
  if (req.method === 'POST') {
    try {
      const { to, type, data, subject, message } = req.body
      
      // Default test data
      const testEmail = to || 'test@example.com'
      const testType = type || 'payment_submitted'
      const testData = data || {
        tenant_name: 'Budi Santoso',
        month: '2025-09',
        room_number: 'KM8',
        phone: '+6281234567890',
        receipt_url: 'https://example.com/receipt.jpg',
        admin_notes: 'Pembayaran sesuai, terima kasih!'
      }
      
      console.log(`📧 Testing email to: ${testEmail}`)
      console.log(`📋 Template type: ${testType}`)
      
      // Check if configured
      if (!config.hasResendKey) {
        return res.status(500).json({
          success: false,
          error: 'Email not configured',
          configuration: config,
          missingVars: {
            RESEND_API_KEY: !config.hasResendKey
          },
          help: 'Get API key from https://resend.com/api-keys'
        })
      }
      
      // Call the Email API
      const baseUrl = req.headers.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const apiUrl = `${baseUrl}/api/send-email`
      
      console.log('🔄 Calling Email API:', apiUrl)
      
      const requestBody = type === 'custom' ? {
        to: testEmail,
        subject: subject || 'Test Email dari Kost App',
        html: message || '<h1>Test Email</h1><p>Email berhasil dikirim!</p>',
        text: message || 'Test Email - Email berhasil dikirim!'
      } : {
        to: testEmail,
        type: testType,
        data: testData
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'KostApp-Test/1.0'
        },
        body: JSON.stringify(requestBody)
      })
      
      const result = await response.json()
      console.log('📧 Email API response:', result)
      
      return res.status(response.status).json({
        success: response.ok,
        testData: {
          email: testEmail,
          type: testType,
          templateData: testData,
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
