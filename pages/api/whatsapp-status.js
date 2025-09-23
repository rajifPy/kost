// pages/api/whatsapp-status.js
import { createClient } from '@supabase/supabase-js';

const supaAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Next.js default body parser will populate req.body for
    // application/x-www-form-urlencoded and application/json.
    const params = req.body || {};

    console.log('Twilio webhook params:', params);

    const insertPayload = {
      direction: 'status',
      channel: 'whatsapp',
      phone_from: params.From || params.from || null,
      phone_to: params.To || params.to || null,
      body: params.Body || params.body || null,
      metadata: params,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supaAdmin.from('message_logs').insert(insertPayload).select();

    if (error) {
      console.error('insert message_logs error', error);
    } else {
      console.log('inserted message_logs id=', data?.[0]?.id);
    }

    // update payment record jika ada MessageSid & MessageStatus
    const sid = params.MessageSid || params.SmsSid || params.messageSid;
    const status = params.MessageStatus || params.status;
    if (sid && status) {
      const { error: updErr } = await supaAdmin
        .from('payments')
        .update({ status })
        .eq('provider_payment_id', sid);

      if (updErr) console.error('update payment err', updErr);
      else console.log('Updated payments for sid=', sid, 'status=', status);
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('whatsapp-status handler error', err);
    return res.status(500).json({ error: err.message });
  }
}
