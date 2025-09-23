// pages/api/whatsapp-status.js
import { createClient } from '@supabase/supabase-js';

// server-side supabase client (service role)
const supaAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Twilio sends urlencoded body; Next.js default parser also handles it
    const params = req.body || {};

    console.log('Twilio webhook params:', params);

    // save raw callback to message_logs for debugging
    const insert = {
      direction: 'status',
      channel: 'whatsapp',
      phone_from: params.From || null,
      phone_to: params.To || null,
      body: params.Body || null,
      metadata: params,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supaAdmin.from('message_logs').insert(insert).select();
    if (error) console.error('insert message_logs error', error);
    else console.log('inserted message_logs id=', data?.[0]?.id);

    // optional: update payments based on MessageSid
    const sid = params.MessageSid || params.SmsSid;
    const status = params.MessageStatus || params.status;
    if (sid && status) {
      const { error: updErr } = await supaAdmin
        .from('payments')
        .update({ status })
        .eq('provider_payment_id', sid);
      if (updErr) console.error('update payment err', updErr);
      else console.log('Updated payment for sid', sid, '->', status);
    }

    return res.status(200).send('OK');
  } catch (e) {
    console.error('whatsapp-status error', e);
    return res.status(500).json({ error: e.message });
  }
}
