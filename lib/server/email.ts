import { Resend } from "resend";
import { env } from "cloudflare:workers";

async function send(subject: string, to: string, html: string, text: string, replyTo?: string) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  // Resend resolves with { data: null, error } on API failures instead of throwing.
  const { error } = await new Resend(env.RESEND_API_KEY).emails.send({ from: env.RESEND_FROM, to, subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) });
  if (error) throw new Error(`Resend ${error.name}: ${error.message}`);
  console.log("email sent", { to, subject });
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);

export type Inquiry = {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
};

export async function sendInquiryEmail(to: string, inquiry: Inquiry) {
  const lines = [
    ["Name", inquiry.name],
    ["Email", inquiry.email],
    ["Phone", inquiry.phone],
    ["Subject", inquiry.subject],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const heading = inquiry.subject?.trim() || "Website inquiry";
  const subject = `New inquiry: ${heading}`;
  const text = [
    ...lines.map(([label, value]) => `${label}: ${value}`),
    "",
    inquiry.message,
    "",
    "Reply directly to this email to answer the sender.",
  ].join("\n");
  const rows = lines
    .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#71717a;font-size:13px;white-space:nowrap">${label}</td><td style="padding:4px 0;color:#18181b;font-size:14px">${escapeHtml(value)}</td></tr>`)
    .join("");
  const html = `<!doctype html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
          <tr><td style="padding:24px 28px;border-bottom:1px solid #e4e4e7"><h1 style="margin:0;font-size:18px;color:#18181b">New website inquiry</h1></td></tr>
          <tr><td style="padding:28px">
            <p style="margin:0 0 16px;color:#18181b;font-size:15px;line-height:1.6">Someone contacted you through your website.</p>
            <table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>
            <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #e4e4e7;color:#18181b;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>
            <p style="margin:16px 0 0;color:#71717a;font-size:13px">Reply directly to this email to answer ${escapeHtml(inquiry.name)}.</p>
          </td></tr>
          <tr><td style="padding:16px 28px;background:#fafafa;border-top:1px solid #e4e4e7;color:#a1a1aa;font-size:12px">Sent from Fullbleed · fullbleed.basilpot.com</td></tr>
        </table>
      </td></tr>
    </table></body>`;
  await send(subject, to, html, text, inquiry.email);
}

export async function sendInviteEmail(to: string, workspaceName: string, inviteUrl: string) {
  const subject = `Invitation to ${workspaceName}`;
  const text = [
    `You've been invited to join the "${workspaceName}" workspace on Fullbleed.`,
    "",
    "Accept the invitation:",
    inviteUrl,
    "",
    "The invitation link expires in 7 days.",
    "",
    "— Fullbleed",
  ].join("\n");
  const html = `<!doctype html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
          <tr><td style="padding:24px 28px;border-bottom:1px solid #e4e4e7"><h1 style="margin:0;font-size:18px;color:#18181b">Fullbleed</h1></td></tr>
          <tr><td style="padding:28px">
            <p style="margin:0 0 16px;color:#18181b;font-size:15px;line-height:1.6">You've been invited to join the workspace <strong>${workspaceName}</strong> on Fullbleed.</p>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#18181b"><a href="${inviteUrl}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600">Accept invitation</a></td></tr></table>
            <p style="margin:20px 0 0;color:#71717a;font-size:13px;line-height:1.6">Or copy this link into your browser:<br>${inviteUrl}</p>
            <p style="margin:16px 0 0;color:#71717a;font-size:13px">The invitation link expires in 7 days.</p>
          </td></tr>
          <tr><td style="padding:16px 28px;background:#fafafa;border-top:1px solid #e4e4e7;color:#a1a1aa;font-size:12px">Sent from Fullbleed · fullbleed.basilpot.com</td></tr>
        </table>
      </td></tr>
    </table></body>`;
  await send(subject, to, html, text);
}