// pages/api/debug-notifications.js - Test direct notification integration
import { Resend } from 'resend'
import Twilio from 'twilio'

export default async function handler(req, res) {
  console.log('🧪 Debug Notifications API called')
  
  const startTime = Date.now()
  
  // Configuration check
  const config = {
    resend: {
      configured: !!process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      fromName: process.env.EMAIL_FROM_NAME || 'Kost Pak Trisno'
    },
    twilio: {
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM),
      accountSid: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'Not set',
      whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'Not set'
    },
    environment: process.env.NODE_ENV || 'unknown'
  }
  
  console.log('📋 Configuration:', config)
  
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Direct Notifications Test API',
      configuration: config,
      usage: {
        get: 'Check configuration',
        post: 'Test direct notifications (no fetch loops)',
        body: {
          phone: '+6281460326800',
          email: 'test@example.com',
          action: 'success|rejected',
          tenant_name: 'Test User'
        }
      }
    })
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      phone = '+6281460326800', // Default test number
      email = 'test@example.com',
      action = 'success',
      tenant_name = 'Test User Debugging'
    } = req.body

    console.log('🧪 Testing direct integration with:', { phone, email, action, tenant_name })

    const results = {
      whatsapp: { attempted: false, success: false, error: null },
      email: { attempted: false, success: false, error: null }
    }

    // ✅ Test Direct WhatsApp (No fetch)
    if (config.twilio.configured) {
      results.whatsapp.attempted = true
      
      try {
        console.log('📱 Testing direct Twilio client...')
        
        const twilioClient = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        
        const message = `🧪 *TEST NOTIFICATION - DIRECT*

Halo ${tenant_name}!

Status: ${action === 'success' ? '✅ BERHASIL' : '❌ DITOLAK'}

⏰ Time: ${new Date().toLocaleString('id-ID')}
🔧 Method: Direct Twilio Client (No Fetch)

---
Kost Pak Trisno - Debug Mode`

        const result = await twilioClient.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
          to: `whatsapp:${phone}`,
          body: message
        })

        results.whatsapp.success = true
        results.whatsapp.sid = result.sid
        results.whatsapp.status = result.status
        
        console.log('✅ WhatsApp sent successfully:', result.sid)
        
      } catch (error) {
        results.whatsapp.error = error.message
        console.error('❌ WhatsApp error:', error)
      }
    } else {
      results.whatsapp.error = 'Twilio not configured'
    }

    // ✅ Test Direct Email (No fetch)
    if (config.resend.configured) {
      results.email.attempted = true
      
      try {
        console.log('📧 Testing direct Resend client...')
        
        const resendClient = new Resend(process.env.RESEND_API_KEY)
        
        const emailContent = {
          subject: `🧪 Test ${action === 'success' ? 'Success' : 'Rejection'} - Direct Integration`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: ${action === 'success' ? '#16a34a' : '#dc2626'};">
                🧪 Test Notification - Direct Integration
              </h2>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>📋 Test Data:</h3>
                <ul>
                  <li><strong>Tenant:</strong> ${tenant_name}</li>
                  <li><strong>Action:</strong> ${action}</li>
                  <li><strong>Method:</strong> Direct Resend Client (No Fetch)</li>
                  <li><strong>Time:</strong> ${new Date().toLocaleString('id-ID')}</li>
                  <li><strong>Email:</strong> ${email}</li>
                </ul>
              </div>
              
              <div style="background: ${action === 'success' ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border-radius: 6px;">
                <p><strong>Status:</strong> ${action === 'success' ? '✅ SUCCESS TEST' : '❌ REJECTION TEST'}</p>
                <p><strong>Configuration:</strong> Working correctly ✅</p>
              </div>
              
              <hr style="margin: 30px 0;">
              <div style="text-align: center; color: #666; font-size: 14px;">
                <strong>Kost Pak Trisno - Debug Mode</strong><br>
                📧 Direct Resend Integration Test
              </div>
            </div>
          `,
          text: `
🧪 TEST NOTIFICATION - DIRECT INTEGRATION

Tenant: ${tenant_name}
Action: ${action}
Method: Direct Resend Client (No Fetch)
Time: ${new Date().toLocaleString('id-ID')}

Status: ${action === 'success' ? '✅ SUCCESS TEST' : '❌ REJECTION TEST'}
Configuration: Working correctly ✅

---
Kost Pak Trisno - Debug Mode
          `
        }

        const result = await resendClient.emails.send({
          from: `${config.resend.fromName} <${config.resend.from}>`,
          to: [email],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        })

        results.email.success = true
        results.email.emailId = result.data?.id
        
        console.log('✅ Email sent successfully:', result.data?.id)
        
      } catch (error) {
        results.email.error = error.message
        console.error('❌ Email error:', error)
      }
    } else {
      results.email.error = 'Resend not configured'
    }

    // Calculate execution time
    const executionTime = Date.now() - startTime
    
    // Generate summary
    const successCount = [results.whatsapp.success, results.email.success].filter(Boolean).length
    const attemptedCount = [results.whatsapp.attempted, results.email.attempted].filter(Boolean).length
    
    const summary = {
      success: successCount > 0,
      attempted: attemptedCount,
      successful: successCount,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    }
    
    console.log(`🎯 Test completed: ${successCount}/${attemptedCount} successful in ${executionTime}ms`)

    return res.status(200).json({
      message: 'Direct notification test completed',
      configuration: config,
      testData: {
        phone,
        email,
        action,
        tenant_name
      },
      results,
      summary,
      recommendations: {
        whatsapp: results.whatsapp.success ? '✅ Working correctly' : results.whatsapp.error || 'Not configured',
        email: results.email.success ? '✅ Working correctly' : results.email.error || 'Not configured',
        overall: successCount === attemptedCount ? '🎉 All services working' : 
                successCount > 0 ? '⚠️ Partial success - check failed services' : 
                '❌ All services failed - check configuration'
      }
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('💥 Debug test error:', error)
    
    return res.status(500).json({
      error: error.message,
      configuration: config,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : 'Hidden in production'
    })
  }
}
