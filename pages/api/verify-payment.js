// File: pages/api/verify-payment.js
// Fixed version dengan error handling yang lebih baik

import { createClient } from '@supabase/supabase-js'
import Twilio from 'twilio'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceKey)

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM
const client = accountSid && authToken ? Twilio(accountSid, authToken) : null

function formatPhoneNumber(phone) {
  if (!phone) return null
  let cleaned = phone.replace(/[\s\-\.]/g, '')
  
  if (cleaned.startsWith('08')) {
    return '+62' + cleaned.substring(1)
  } else if (cleaned.startsWith('62') && !cleaned.startsWith('+62')) {
    return '+' + cleaned
  } else if (cleaned.startsWith('+62')) {
    return cleaned
  } else if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    return '+62' + cleaned
  }
  
  return cleaned
}

async function sendWhatsApp(to, message) {
  console.log('📱 WhatsApp attempt:', { to, client: !!client, from: whatsappFrom })

  if (!client || !whatsappFrom) {
    console.log('⚠️ WhatsApp not configured')
    return { success: false, error: 'WhatsApp service not configured' }
  }

  try {
    const formattedPhone = formatPhoneNumber(to)
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone number format' }
    }

    console.log(`📤 Sending WhatsApp: ${whatsappFrom} → ${formattedPhone}`)

    const result = await client.messages.create({
      from: `whatsapp:${whatsappFrom}`,
      to: `whatsapp:${formattedPhone}`,
      body: message
    })

    console.log('✅ WhatsApp sent:', result.sid)
    return { success: true, sid: result.sid, to: formattedPhone }

  } catch (error) {
    console.error('❌ WhatsApp error:', error.message)
    
    let errorMsg = 'WhatsApp send failed'
    if (error.code === 21211) errorMsg = 'Invalid phone number'
    else if (error.code === 63016) errorMsg = 'Must join WhatsApp sandbox'
    else if (error.code === 21408) errorMsg = 'WhatsApp sender not approved'

    return { success: false, error: errorMsg, code: error.code }
  }
}

function createWhatsAppMessage(payment, status) {
  const { tenant_name, month, room_number } = payment
  
  if (status === 'success') {
    return `✅ *PEMBAYARAN DITERIMA*

Halo *${tenant_name}*,

Pembayaran kost untuk bulan *${month}* telah *DITERIMA*! ✨

${room_number ? `🏠 Kamar: *${room_number}*` : ''}

Terima kasih atas pembayaran tepat waktu! 🙏

_— Kost Pak Trisno —_`
  } 
  
  if (status === 'rejected') {
    return `❌ *PEMBAYARAN DITOLAK*

Halo *${tenant_name}*,

Pembayaran kost untuk bulan *${month}* *DITOLAK*. 😔

${room_number ? `🏠 Kamar: *${room_number}*` : ''}

Silakan upload ulang bukti yang lebih jelas di:
${process.env.NEXT_PUBLIC_APP_URL || 'https://kostsaya.vercel.app/'}/payment

_— Kost Pak Trisno —_`
  }

  return `Status pembayaran ${tenant_name} untuk ${month}: ${status.toUpperCase()}`
}

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
    
    // Get payment with tenant relationship
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select(`
        *,
        tenants (
          name,
          phone,
          room_number
        )
      `)
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
      phone: payment.phone,
      hasTenantsRelation: !!payment.tenants
    })

    // Determine final data (tenant relation takes precedence)
    const finalTenantName = payment.tenants?.name || payment.tenant_name
    const finalPhone = payment.tenants?.phone || payment.phone
    const finalRoomNumber = payment.tenants?.room_number || payment.room_number

    console.log('📊 Final data resolved:', {
      finalTenantName,
      finalPhone,
      finalRoomNumber
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

    // Prepare WhatsApp notification
    let whatsappResult = { success: false, error: 'No phone number' }
    
    if (finalPhone) {
      const whatsappMessage = createWhatsAppMessage({
        tenant_name: finalTenantName,
        month: payment.month,
        room_number: finalRoomNumber
      }, newStatus)

      console.log('📱 Attempting WhatsApp notification...')
      whatsappResult = await sendWhatsApp(finalPhone, whatsappMessage)
    } else {
      console.log('⚠️ No phone number available for WhatsApp')
    }

    // Final response
    const response = {
      success: true,
      payment: {
        id: payment.id,
        tenant_name: finalTenantName,
        phone: finalPhone,
        room_number: finalRoomNumber,
        month: payment.month,
        status: newStatus
      },
      whatsapp_notification: whatsappResult,
      message: whatsappResult.success 
        ? `Payment ${newStatus}. WhatsApp sent to ${finalPhone}` 
        : `Payment ${newStatus}. WhatsApp failed: ${whatsappResult.error}`,
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
