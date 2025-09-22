const Twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

console.log('🔍 Checking Twilio Configuration:');
console.log('ACCOUNT_SID:', accountSid ? '✅ Set' : '❌ Missing');
console.log('AUTH_TOKEN:', authToken ? '✅ Set' : '❌ Missing');
console.log('WHATSAPP_FROM:', whatsappFrom ? `✅ ${whatsappFrom}` : '❌ Missing');

if (!accountSid || !authToken || !whatsappFrom) {
  console.error('\n❌ Configuration incomplete. Set environment variables first.');
  process.exit(1);
}

const client = Twilio(accountSid, authToken);
const testPhone = process.argv[2] || '+6281234567890';
const testMessage = process.argv[3] || '🧪 Test WhatsApp dari Kost App';

console.log(`\n📱 Testing WhatsApp to: ${testPhone}`);

client.messages.create({
  from: `whatsapp:${whatsappFrom}`,
  to: `whatsapp:${testPhone}`,
  body: testMessage
}).then(message => {
  console.log('✅ SUCCESS! Message SID:', message.sid);
  console.log('📊 Status:', message.status);
  console.log('💰 Price:', message.price, message.priceUnit);
}).catch(error => {
  console.error('❌ FAILED:', error.message);
  console.error('🔢 Error Code:', error.code);
  console.error('📄 More Info:', error.moreInfo);
  
  // Common error solutions
  if (error.code === 63016) {
    console.log('\n💡 SOLUTION: Recipient must join WhatsApp sandbox:');
    console.log('1. Send "join <sandbox-keyword>" to +14155238886');
    console.log('2. Or use Twilio Console to send join code');
  } else if (error.code === 21211) {
    console.log('\n💡 SOLUTION: Check phone number format');
    console.log('Should be: +6281234567890 (not 08123456789)');
  }
});
