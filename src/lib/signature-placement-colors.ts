export const SIGNATURE_PLACEMENT_COLORS = [
  {
    border: "#9A4E69",
    background: "rgba(154, 78, 105, 0.18)",
    label: "#9A4E69",
  },
  {
    border: "#2F6F73",
    background: "rgba(47, 111, 115, 0.18)",
    label: "#2F6F73",
  },
  {
    border: "#A66A2C",
    background: "rgba(166, 106, 44, 0.18)",
    label: "#A66A2C",
  },
  {
    border: "#5F5AA2",
    background: "rgba(95, 90, 162, 0.18)",
    label: "#5F5AA2",
  },
  {
    border: "#4F7F3A",
    background: "rgba(79, 127, 58, 0.18)",
    label: "#4F7F3A",
  },
] as const;

export function getSignaturePlacementColor(index: number) {
  return SIGNATURE_PLACEMENT_COLORS[Math.abs(index) % SIGNATURE_PLACEMENT_COLORS.length];
}

export function getSignaturePlacementVisualState(index: number, isActive: boolean) {
  return {
    color: getSignaturePlacementColor(index),
    borderWidth: isActive ? 3 : 2,
    opacity: isActive ? 1 : 0.45,
    shadow: isActive ? "0 0 0 9999px rgba(255,255,255,0.16), 0 14px 32px -20px rgba(47,37,41,0.55)" : "none",
  };
}
