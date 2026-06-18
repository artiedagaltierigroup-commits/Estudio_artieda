interface SignatureEmailContentParams {
  subject: string;
  message?: string | null;
  signingUrl: string;
  emailOpenUrl?: string | null;
}

interface SendSignatureRequestEmailParams extends SignatureEmailContentParams {
  to: string;
}

interface BuildRecipientSignatureEmailParams {
  recipientEmail: string;
  subject: string;
  message?: string | null;
  token: string;
  baseUrl?: string;
}

const ctaLabel = "Firmar solicitud";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildSigningUrl(token: string, baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") {
  return `${baseUrl.replace(/\/$/, "")}/firmar/${token}`;
}

export function buildEmailOpenUrl(token: string, baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") {
  return `${baseUrl.replace(/\/$/, "")}/api/signatures/email-open/${token}`;
}

export function buildRecipientSignatureEmail(params: BuildRecipientSignatureEmailParams): SendSignatureRequestEmailParams {
  return {
    to: params.recipientEmail,
    subject: params.subject,
    message: params.message,
    signingUrl: buildSigningUrl(params.token, params.baseUrl),
    emailOpenUrl: buildEmailOpenUrl(params.token, params.baseUrl),
  };
}

export function buildEmailText(params: SignatureEmailContentParams) {
  return [
    params.subject,
    "",
    params.message ?? "Te enviamos este documento para revisar y firmar electronicamente.",
    "",
    ctaLabel,
    params.signingUrl,
    "",
    "La apertura de correo puede no detectarse si tu cliente bloquea imagenes.",
  ].join("\n");
}

export function buildEmailHtml(params: SignatureEmailContentParams) {
  const escapedSubject = escapeHtml(params.subject);
  const escapedMessage = escapeHtml(
    params.message ?? "Te enviamos este documento para revisar y firmar electronicamente."
  );
  const escapedUrl = escapeHtml(params.signingUrl);
  const trackingPixel = params.emailOpenUrl
    ? `<img src="${escapeHtml(params.emailOpenUrl)}" width="1" height="1" alt="" style="display:none" />`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;color:#2f2529;line-height:1.55">
      <h1 style="font-size:20px;margin:0 0 12px">${escapedSubject}</h1>
      <p style="margin:0 0 20px">${escapedMessage}</p>
      <p style="margin:0 0 20px">
        <a href="${escapedUrl}" style="display:inline-block;background:#7a384f;color:white;padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:700">
          ${ctaLabel}
        </a>
      </p>
      <p style="font-size:12px;color:#6f6468;margin:0">
        La apertura de correo puede no detectarse si el cliente bloquea imagenes.
      </p>
      ${trackingPixel}
    </div>
  `;
}

export async function sendSignatureRequestEmail(params: SendSignatureRequestEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SIGNATURE_EMAIL_FROM;

  if (!apiKey || !from) {
    console.info("Signature email skipped: missing RESEND_API_KEY or SIGNATURE_EMAIL_FROM", params);
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: buildEmailHtml(params),
      text: buildEmailText(params),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`No se pudo enviar el correo de firma: ${body}`);
  }

  return response.json();
}
