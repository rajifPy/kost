import Twilio from 'twilio'

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).send({error:'Method not allowed'})
  const { to, body } = req.body
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = process.env.TWILIO_FROM
  if(!twilioSid || !twilioToken) return res.status(500).send({error:'Twilio not configured'})
  const client = Twilio(twilioSid, twilioToken)
  try{
    await client.messages.create({ from: twilioFrom, to, body })
    res.status(200).send({ok:true})
  }catch(err){
    console.error(err)
    res.status(500).send({error:err.message})
  }
}
