import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: nodemailer.Transporter | null = null;

const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  let host = process.env.SMTP_HOST || 'smtp.ethereal.email';
  let port = Number(process.env.SMTP_PORT) || 587;
  let secure = process.env.SMTP_SECURE === 'true';
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log('No SMTP credentials found in env. Creating a dynamic Ethereal test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      host = 'smtp.ethereal.email';
      port = 587;
      secure = false;
      user = testAccount.user;
      pass = testAccount.pass;
      console.log(`Generated Ethereal Credentials:`);
      console.log(`User: ${user}`);
      console.log(`Pass: ${pass}`);
    } catch (err) {
      console.error('Failed to generate Ethereal account dynamically, using hardcoded fallback:', err);
      host = 'smtp.ethereal.email';
      port = 587;
      secure = false;
      user = 'eleanor.pfeffer@ethereal.email';
      pass = 'GZkqgM756uU7fK7KqK';
    }
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const activeTransporter = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Job Scheduler" <test@ethereal.email>';
    const info = await activeTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
    });
    console.log(`Message sent to ${to}: %s`, info.messageId);
    
    // Only print the preview URL if we are using the Ethereal sandbox
    if ((activeTransporter.options as any).host === 'smtp.ethereal.email') {
      console.log(`Preview URL: %s`, nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw error;
  }
};
