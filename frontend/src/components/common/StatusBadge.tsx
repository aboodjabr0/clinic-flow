import "./StatusBadge.css";

type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
}

export function StatusBadge({ label, variant = "neutral" }: StatusBadgeProps) {
  return <span className={`status-badge status-badge-${variant}`}>{label}</span>;
}
