import * as nodemailer from 'nodemailer';
import { config } from '../config/secrets';

/**
 * Email message structure
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

/**
 * Create email transporter
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.password,
    },
  });
}

/**
 * Send email via SMTP
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: message.from || config.smtp.user,
      to: message.to,
      subject: message.subject,
      text: message.body,
      html: `<p>${message.body.replace(/\n/g, '<br>')}</p>`,
    };

    console.log(`📧 Sending email to: ${message.to}`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent successfully: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw new Error(`Email send failed: ${error}`);
  }
}

/**
 * Mock email send (for testing)
 */
export async function mockSendEmail(message: EmailMessage): Promise<void> {
  console.log('📧 [MOCK] Email sent:');
  console.log(`   To: ${message.to}`);
  console.log(`   Subject: ${message.subject}`);
  console.log(`   Body: ${message.body.substring(0, 100)}...`);
}
