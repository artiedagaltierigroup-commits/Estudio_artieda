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
    panel: "border-[#e5ccd5] bg-white",
    iconWrap: "bg-[#f4dce4] text-[#8f3d58]",
    icon: "text-[#8f3d58]",
    chip: "border border-[#e2c3ce] bg-[#f8e8ee] text-[#8f3d58]",
    dot: "bg-[#be5576]",
    accent: "text-[#8f3d58]",
  },
  sage: {
    panel: "border-[#d7e5de] bg-white",
    iconWrap: "bg-[#e4f0ea] text-[#466a58]",
    icon: "text-[#466a58]",
    chip: "border border-[#d0e2d8] bg-[#eef6f1] text-[#466a58]",
    dot: "bg-[#7bbe9e]",
    accent: "text-[#466a58]",
  },
  amber: {
    panel: "border-[#ead9cd] bg-white",
    iconWrap: "bg-[#f6e9e0] text-[#925845]",
    icon: "text-[#925845]",
    chip: "border border-[#ebd8ca] bg-[#faf0ea] text-[#925845]",
    dot: "bg-[#c57a60]",
    accent: "text-[#925845]",
  },
  slate: {
    panel: "border-[#e7dfe2] bg-white",
    iconWrap: "bg-[#f3edef] text-[#6e5962]",
    icon: "text-[#6e5962]",
    chip: "border border-[#e3d8dc] bg-[#f7f2f4] text-[#6e5962]",
    dot: "bg-[#8b717a]",
    accent: "text-[#6e5962]",
  },
  lilac: {
    panel: "border-[#ead3dc] bg-white",
    iconWrap: "bg-[#f5e3e9] text-[#96526a]",
    icon: "text-[#96526a]",
    chip: "border border-[#e5ccd6] bg-[#faecf1] text-[#96526a]",
    dot: "bg-[#d886a2]",
    accent: "text-[#96526a]",
  },
  danger: {
    panel: "border-[#efcfcf] bg-white",
    iconWrap: "bg-[#f7e4e4] text-[#9b4747]",
    icon: "text-[#9b4747]",
    chip: "border border-[#efc8c8] bg-[#fcf0f0] text-[#9b4747]",
    dot: "bg-[#d96c6c]",
    accent: "text-[#9b4747]",
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
