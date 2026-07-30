import dotenv from 'dotenv';

dotenv.config();

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    // We parse the SMTP_FROM variable you already had, or default to your email
    const fromAddress = process.env.SMTP_FROM || 'Akash Jasrotia <akashjasrotia2005@gmail.com>';
    
    if (!apiKey) {
      console.error('BREVO_API_KEY is missing from environment variables!');
      throw new Error('Missing BREVO_API_KEY');
    }

    // Parse the from address format "Name <email@domain.com>" or just "email@domain.com"
    let fromEmail = fromAddress;
    let fromName = '';
    const match = fromAddress.match(/(.*)<(.*)>/);
    if (match) {
      fromName = match[1].trim();
      fromEmail = match[2].trim();
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: fromName || undefined, email: fromEmail },
        to: [{ email: to }],
        subject: subject,
        textContent: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Brevo API Error: ${response.status} ${response.statusText}`, errorData);
      throw new Error(`Failed to send email via Brevo: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log(`Message sent to ${to} via Brevo: %s`, data.messageId);
    return data;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw error;
  }
};
