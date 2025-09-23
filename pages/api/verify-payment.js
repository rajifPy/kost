// pages/api/verify-payment.js - Quick fix untuk disable WhatsApp sementara
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceKey)

export default async function handler(req, res){
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method)
    return res.status(405).json({error: 'Method not allowed'})
  }

  console.log('🚀 Verify Payment API called')
  console.log('📋 Request body:', JSON.stringify(req.body, null, 2))

  const { id, action } = req.body

  // Validate input
  if (!id || !action) {
    console.log('❌ Missing parameters:', { id, action })
    return res.status(400).json({
      error: 'Missing required parameters',
      required: { id: 'payment UUID', action: 'success|rejected' },
      received: { id, action }
    })
  }

  if (!['success', 'rejected'].includes(action)) {
    console.log('❌ Invalid action:', action)
    return res.status(400).json({
      error: 'Invalid action',
      validActions: ['success', 'rejected'],
      received: action
    })
  }

  // Check environment
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase configuration')
    return res.status(500).json({
      error: 'Server configuration error',
      details: 'Supabase not configured'
    })
  }

  try {
    console.log('🔍 Fetching payment:', id)
    
    // Get payment - SIMPLIFIED: tanpa complex join
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('❌ Database fetch error:', fetchError)
      return res.status(500).json({
        error: 'Database fetch failed',
        details: fetchError.message,
        hint: fetchError.hint
      })
    }

    if (!payment) {
      console.error('❌ Payment not found:', id)
      return res.status(404).json({
        error: 'Payment not found',
        paymentId: id
      })
    }

    console.log('✅ Payment found:', {
      id: payment.id,
      tenant_name: payment.tenant_name,
      phone: payment.phone
    })

    // Update payment status
    const newStatus = action === 'success' ? 'success' : 'rejected'
    
    console.log('🔄 Updating payment status to:', newStatus)

    const { data: updateData, error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      return res.status(500).json({
        error: 'Database update failed',
        details: updateError.message,
        hint: updateError.hint
      })
    }

    console.log('✅ Payment status updated successfully')

    // DISABLE WhatsApp notification sementara
    const whatsappResult = { 
      success: false, 
      error: 'WhatsApp notification disabled (service not configured)' 
    }

    // Final response
    const response = {
      success: true,
      payment: {
        id: payment.id,
        tenant_name: payment.tenant_name,
        phone: payment.phone,
        room_number: payment.room_number,
        month: payment.month,
        status: newStatus
      },
      whatsapp_notification: whatsappResult,
      message: `Payment ${newStatus}ed successfully! ✅ (WhatsApp notification disabled)`,
      timestamp: new Date().toISOString()
    }

    console.log('🎉 API Success:', response)
    return res.status(200).json(response)

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      name: error.name,
      timestamp: new Date().toISOString()
    })
  }
}
