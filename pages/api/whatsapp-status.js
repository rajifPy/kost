// pages/api/whatsapp-status.js
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } }; // kita parse manual

const supaAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // baca raw body (Twilio mengirim urlencoded)
    const raw = (await buffer(req)).toString();
    const params = Object.fromEntries(new URLSearchParams(raw));
    // params sekarang berisi MessageSid, MessageStatus, To, From, Body, dll.
    console.log('Twilio webhook params:', params);

    // simpan ke message_logs
    const insertPayload = {
      direction: 'status',
      channel: 'whatsapp',
      phone_from: params.From || null,
      phone_to: params.To || null,
      body: params.Body || null,
      metadata: params, // simpan raw untuk debugging
      created_at: new Date().toISOString()
    };

    const { data, error } = await supaAdmin.from('message_logs').insert(insertPayload).select();
    if (error) console.error('insert error', error);
    else console.log('inserted message_logs id=', data?.[0]?.id);

    // optional: update payment by provider_payment_id (MessageSid)
    if (params.MessageSid && params.MessageStatus) {
      const { error: updErr } = await supaAdmin
        .from('payments')
        .update({ status: params.MessageStatus })
        .eq('provider_payment_id', params.MessageSid);
      if (updErr) console.error('update payment err', updErr);
    }

    return res.status(200).send('OK');
  } catch (e) {
    console.error('whatsapp-status error', e);
    return res.status(500).json({ error: e.message });
  }
}
