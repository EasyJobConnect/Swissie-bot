import * as Twilio from 'twilio';
import { config } from '../config/secrets';

/**
 * Voice call structure
 */
export interface VoiceCall {
  to: string;
  message: string;
  from?: string;
}

/**
 * SMS message structure
 */
export interface SmsMessage {
  to: string;
  body: string;
  from?: string;
}

/**
 * Create Twilio client
 */
function getTwilioClient() {
  return Twilio.default(config.twilio.accountSid, config.twilio.authToken);
}

/**
 * Make a voice call
 */
export async function makeVoiceCall(call: VoiceCall): Promise<void> {
  try {
    const client = getTwilioClient();
    
    const twimlUrl = `http://twimlets.com/echo?Twiml=${encodeURIComponent(
      `<Response><Say>${call.message}</Say></Response>`
    )}`;

    console.log(`📞 Making voice call to: ${call.to}`);
    
    const result = await client.calls.create({
      to: call.to,
      from: call.from || config.twilio.phoneNumber,
      url: twimlUrl,
    });

    console.log(`✅ Voice call initiated: ${result.sid}`);
  } catch (error) {
    console.error('❌ Failed to make voice call:', error);
    throw new Error(`Voice call failed: ${error}`);
  }
}

/**
 * Send SMS
 */
export async function sendSms(sms: SmsMessage): Promise<void> {
  try {
    const client = getTwilioClient();

    console.log(`📱 Sending SMS to: ${sms.to}`);
    
    const result = await client.messages.create({
      to: sms.to,
      from: sms.from || config.twilio.phoneNumber,
      body: sms.body,
    });

    console.log(`✅ SMS sent successfully: ${result.sid}`);
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    throw new Error(`SMS send failed: ${error}`);
  }
}

/**
 * Mock voice call (for testing)
 */
export async function mockMakeVoiceCall(call: VoiceCall): Promise<void> {
  console.log('📞 [MOCK] Voice call initiated:');
  console.log(`   To: ${call.to}`);
  console.log(`   Message: ${call.message.substring(0, 100)}...`);
}

/**
 * Mock SMS (for testing)
 */
export async function mockSendSms(sms: SmsMessage): Promise<void> {
  console.log('📱 [MOCK] SMS sent:');
  console.log(`   To: ${sms.to}`);
  console.log(`   Body: ${sms.body.substring(0, 100)}...`);
}
