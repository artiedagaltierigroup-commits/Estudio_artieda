export function getHorizontalBarChartHeight(itemsCount: number, options?: { rowHeight?: number; minHeight?: number }) {
  const rowHeight = options?.rowHeight ?? 48;
  const minHeight = options?.minHeight ?? 220;

  return Math.max(minHeight, itemsCount * rowHeight);
}

export function formatStatisticsAxisValue(value: number) {
  return `$${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}
