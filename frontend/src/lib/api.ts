export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchScheduledEmails() {
  const res = await fetch(`${API_BASE_URL}/emails/scheduled`);
  if (!res.ok) throw new Error('Failed to fetch scheduled emails');
  return res.json();
}

export async function fetchSentEmails() {
  const res = await fetch(`${API_BASE_URL}/emails/sent`);
  if (!res.ok) throw new Error('Failed to fetch sent emails');
  return res.json();
}

export async function scheduleEmails(payload: {
  subject: string;
  body: string;
  recipientEmails: string[];
  startTime: string;
  delayBetweenEmails: number;
  maxEmailsPerHour?: number;
  senderIdentity: string;
}) {
  const res = await fetch(`${API_BASE_URL}/emails/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to schedule emails');
  return res.json();
}
