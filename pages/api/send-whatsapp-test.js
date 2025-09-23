// pages/api/send-whatsapp-test.js
import Twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !whatsappFrom) {
    console.error('Twilio env missing');
    return res.status(500).json({ error: 'Twilio env missing' });
  }

  const client = Twilio(accountSid, authToken);
  const to = req.body?.to || 'whatsapp:+6281460326800';
  try {
    console.log('Calling Twilio to send to', to);
    const msg = await client.messages.create({
      from: whatsappFrom,
      to,
      body: 'Test message from send-whatsapp-test'
      // optional: statusCallback: `${process.env.BASE_URL}/api/whatsapp-status`
    });
    console.log('Twilio response sid=', msg.sid);
    return res.status(200).json({ sid: msg.sid, status: msg.status });
  } catch (err) {
    console.error('Twilio send error', err);
    return res.status(500).json({ error: err.message, code: err.code, more: err.moreInfo });
  }
}
