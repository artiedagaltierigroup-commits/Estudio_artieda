export type VisualTone = "rose" | "sage" | "amber" | "slate" | "lilac" | "danger";

interface ToneStyles {
  panel: string;
  iconWrap: string;
  icon: string;
  chip: string;
  dot: string;
  accent: string;
}

const toneStylesMap: Record<VisualTone, ToneStyles> = {
  rose: {
    panel:
      "border-primary/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,214,224,0.32))]",
    iconWrap: "bg-primary/16 text-[#8f4e68]",
    icon: "text-[#8f4e68]",
    chip: "border border-primary/20 bg-primary/10 text-[#8f4e68]",
    dot: "bg-[#c76c8a]",
    accent: "text-[#8f4e68]",
  },
  sage: {
    panel:
      "border-[#d5e7dd] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(123,190,158,0.16))]",
    iconWrap: "bg-[#dff0e7] text-[#48745f]",
    icon: "text-[#48745f]",
    chip: "border border-[#cae6d7] bg-[#edf7f1] text-[#48745f]",
    dot: "bg-[#7bbe9e]",
    accent: "text-[#48745f]",
  },
  amber: {
    panel:
      "border-[#ecdab7] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,211,146,0.18))]",
    iconWrap: "bg-[#fbefd5] text-[#8a6334]",
    icon: "text-[#8a6334]",
    chip: "border border-[#ecdab7] bg-[#fbf3df] text-[#8a6334]",
    dot: "bg-[#d4a15b]",
    accent: "text-[#8a6334]",
  },
  slate: {
    panel:
      "border-[#e4d9df] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(138,124,132,0.10))]",
    iconWrap: "bg-[#f4edf0] text-[#6e6169]",
    icon: "text-[#6e6169]",
    chip: "border border-[#e4d9df] bg-[#f7f2f4] text-[#6e6169]",
    dot: "bg-[#8a7c84]",
    accent: "text-[#6e6169]",
  },
  lilac: {
    panel:
      "border-[#e0d6f0] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(201,182,228,0.18))]",
    iconWrap: "bg-[#eee6f8] text-[#6f5d94]",
    icon: "text-[#6f5d94]",
    chip: "border border-[#e0d6f0] bg-[#f3eef9] text-[#6f5d94]",
    dot: "bg-[#c9b6e4]",
    accent: "text-[#6f5d94]",
  },
  danger: {
    panel:
      "border-[#edc5c5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(217,108,108,0.16))]",
    iconWrap: "bg-[#f8e7e7] text-[#9d4d4d]",
    icon: "text-[#9d4d4d]",
    chip: "border border-[#efc8c8] bg-[#fcf0f0] text-[#9d4d4d]",
    dot: "bg-[#d96c6c]",
    accent: "text-[#9d4d4d]",
  },
};

export function getToneStyles(tone: VisualTone): ToneStyles {
  return toneStylesMap[tone];
}

export function getCaseStatusTone(status: string): VisualTone {
  switch (status) {
    case "ACTIVE":
      return "sage";
    case "SUSPENDED":
      return "amber";
    case "CLOSED":
    default:
      return "slate";
  }
}

export function getChargeStatusTone(status: string): VisualTone {
  switch (status) {
    case "PAID":
      return "sage";
    case "PARTIAL":
      return "lilac";
    case "OVERDUE":
      return "danger";
    case "CANCELLED":
      return "slate";
    case "PENDING":
    default:
      return "amber";
  }
}

export function getNameInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "CL";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
