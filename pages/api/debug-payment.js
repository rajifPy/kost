// File: pages/api/debug-payment.js
// Test API endpoint untuk debug payment specific

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  console.log('🔍 Debug Payment API called')
  console.log('Method:', req.method)
  console.log('Query:', req.query)
  console.log('Body:', req.body)
  
  try {
    // Test environment variables
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!serviceKey,
          url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : null
        }
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    console.log('✅ Supabase client created')

    // Test 1: Get all pending payments
    const { data: allPayments, error: allError } = await supabase
      .from('payments')
      .select('id, tenant_name, phone, status, tenant_id')
      .eq('status', 'pending')
      .limit(5)

    console.log('📊 All pending payments:', allPayments?.length || 0)

    // Test 2: Get payments with tenants join (like in verify-payment)
    const { data: joinedPayments, error: joinError } = await supabase
      .from('payments')
      .select(`
        *,
        tenants (
          name,
          phone, 
          room_number
        )
      `)
      .eq('status', 'pending')
      .limit(3)

    console.log('🔗 Joined payments:', joinedPayments?.length || 0)
    
    // Test 3: Try updating a payment (dry run)
    const testPaymentId = allPayments?.[0]?.id
    let updateTest = 'No payments to test'
    
    if (testPaymentId) {
      const { data: updateData, error: updateError } = await supabase
        .from('payments')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', testPaymentId)
        .select()

      updateTest = updateError ? `Error: ${updateError.message}` : 'Success'
      console.log('🔄 Update test result:', updateTest)
    }

    // Test 4: Check Twilio configuration
    const twilioCheck = {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasWhatsAppFrom: !!process.env.TWILIO_WHATSAPP_FROM,
      whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'Not set'
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!serviceKey,
        twilio: twilioCheck
      },
      database: {
        allPaymentsQuery: allError ? `Error: ${allError.message}` : `Success (${allPayments?.length} found)`,
        joinedQuery: joinError ? `Error: ${joinError.message}` : `Success (${joinedPayments?.length} found)`,
        updateTest: updateTest
      },
      sampleData: {
        payments: allPayments || [],
        paymentsWithTenants: joinedPayments || []
      }
    })

  } catch (error) {
    console.error('💥 Debug API error:', error)
    return res.status(500).json({
      error: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : 'Hidden in production'
    })
  }
}
