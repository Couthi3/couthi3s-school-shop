export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export const PICKUP_PERIODS = [
  "Before school",
  "Period 1",
  "Period 2",
  "Period 3",
  "Period 4",
  "Period 5",
  "Period 6",
  "Period 7",
  "Period 8",
  "After school",
] as const;

export function statusColor(status: string): string {
  switch (status) {
    case "new":
      return "bg-[var(--swiss-red)] text-white";
    case "ready":
      return "bg-[var(--swiss-blue)] text-white";
    default:
      return "bg-foreground text-background";
  }
}
