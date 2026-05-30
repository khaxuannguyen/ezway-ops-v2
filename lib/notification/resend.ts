/**
 * Gửi email transactional qua Resend.com (free tier 100/day).
 * Doc: https://resend.com/docs/api-reference/emails/send-email
 *
 * Behavior:
 *  - Thiếu RESEND_API_KEY trong .env → log warn + skip (không throw)
 *  - Network error → log + return { ok: false } (không crash callback)
 *
 * Endpoint POST https://api.resend.com/emails
 */

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Default `EZWAY Ops <onboarding@resend.dev>` nếu chưa cấu hình domain. */
  from?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "EZWAY Ops <onboarding@resend.dev>";

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      "[resend] RESEND_API_KEY chưa cấu hình — skip send email tới",
      input.to
    );
    return { ok: false, error: "missing_api_key" };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[resend] HTTP", res.status, body);
      return { ok: false, error: `http_${res.status}` };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  } catch (err) {
    console.error("[resend] send failed", err);
    return { ok: false, error: String(err) };
  }
}
