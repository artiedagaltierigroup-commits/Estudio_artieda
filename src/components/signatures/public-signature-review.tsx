import { formatDateTime } from "@/lib/utils";
import { Clock3, FileText, Mail, ShieldCheck, UserRound } from "lucide-react";

interface PublicSignatureReviewProps {
  subject: string;
  message: string | null;
  recipientName: string | null;
  recipientEmail: string;
  tokenExpiresAt: Date;
}

export function PublicSignatureReview({
  subject,
  message,
  recipientName,
  recipientEmail,
  tokenExpiresAt,
}: PublicSignatureReviewProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-border/70 bg-white/90 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          {subject}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {message ?? "Revisa el documento y confirma la firma electronica cuando estes conforme."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] border border-border/70 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <UserRound className="h-4 w-4 text-primary" />
            {recipientName ?? "Firmante"}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{recipientEmail}</p>
        </div>
        <div className="rounded-[24px] border border-border/70 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock3 className="h-4 w-4 text-primary" />
            Vence
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(tokenExpiresAt)}</p>
        </div>
      </div>
      <div className="rounded-[24px] border border-[#b8d8c5] bg-[#f4fbf6] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#48745f]">
          <ShieldCheck className="h-4 w-4" />
          Firma electronica
        </div>
        <p className="mt-2 text-xs leading-5 text-[#48745f]">
          Se registrara fecha, hora y datos tecnicos de la operacion para respaldar la constancia.
        </p>
      </div>
      <div className="rounded-[24px] border border-border/70 bg-white/90 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Mail className="h-4 w-4 text-primary" />
          Dudas sobre el documento
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Si algo no coincide, no firmes y consulta al estudio antes de continuar.
        </p>
      </div>
    </div>
  );
}
