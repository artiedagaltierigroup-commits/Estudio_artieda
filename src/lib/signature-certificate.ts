import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface CertificateEvent {
  type: string;
  createdAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface BuildCertificateParams {
  requestId: string;
  subject: string;
  signerName?: string | null;
  signerEmail: string;
  clientName?: string | null;
  caseTitle?: string | null;
  originalSha256: string;
  signedSha256?: string | null;
  signatureSha256?: string | null;
  signedAt?: Date | null;
  events: CertificateEvent[];
}

export function buildSignatureCertificateData(params: BuildCertificateParams) {
  return {
    title: "Constancia de firma electronica",
    request: {
      id: params.requestId,
      subject: params.subject,
      clientName: params.clientName ?? null,
      caseTitle: params.caseTitle ?? null,
    },
    signer: {
      name: params.signerName ?? params.signerEmail,
      email: params.signerEmail,
    },
    hashes: {
      originalSha256: params.originalSha256,
      signedSha256: params.signedSha256 ?? null,
      signatureSha256: params.signatureSha256 ?? null,
    },
    signedAt: params.signedAt ?? null,
    events: params.events.map((event) => ({
      type: event.type,
      createdAt: event.createdAt,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
    })),
  };
}

type CertificateData = ReturnType<typeof buildSignatureCertificateData>;

function formatCertificateDate(date: Date | null) {
  if (!date) return "No disponible";
  return date.toISOString();
}

function splitLine(line: string, maxLength = 92) {
  const words = line.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export async function generateSignatureCertificatePdf(data: CertificateData) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  let y = 785;

  function ensureSpace(required = 36) {
    if (y - required > margin) return;
    page = pdf.addPage([595.28, 841.89]);
    y = 785;
  }

  function drawText(text: string, options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> }) {
    const size = options?.size ?? 10;
    const font = options?.bold ? bold : regular;
    for (const line of splitLine(text)) {
      ensureSpace(size + 8);
      page.drawText(line, {
        x: margin,
        y,
        size,
        font,
        color: options?.color ?? rgb(0.18, 0.15, 0.16),
      });
      y -= size + 7;
    }
  }

  function drawSection(title: string) {
    ensureSpace(34);
    y -= 8;
    drawText(title, { size: 12, bold: true, color: rgb(0.42, 0.2, 0.29) });
  }

  drawText(data.title, { size: 18, bold: true, color: rgb(0.42, 0.2, 0.29) });
  y -= 12;
  drawText(`Solicitud: ${data.request.subject}`);
  drawText(`ID de solicitud: ${data.request.id}`);
  drawText(`Fecha de firma: ${formatCertificateDate(data.signedAt)}`);

  drawSection("Firmante");
  drawText(`Nombre: ${data.signer.name}`);
  drawText(`Email: ${data.signer.email}`);

  drawSection("Asociacion");
  drawText(`Cliente: ${data.request.clientName ?? "Sin cliente asociado"}`);
  drawText(`Caso: ${data.request.caseTitle ?? "Sin caso asociado"}`);

  drawSection("Hashes");
  drawText(`PDF original SHA-256: ${data.hashes.originalSha256}`);
  drawText(`PDF firmado SHA-256: ${data.hashes.signedSha256 ?? "No disponible"}`);
  drawText(`Firma SHA-256: ${data.hashes.signatureSha256 ?? "No disponible"}`);

  drawSection("Eventos");
  for (const event of data.events) {
    drawText(`${event.createdAt.toISOString()} - ${event.type}`);
    if (event.ipAddress) drawText(`IP: ${event.ipAddress}`);
    if (event.userAgent) drawText(`Dispositivo: ${event.userAgent}`);
  }

  return pdf.save();
}
