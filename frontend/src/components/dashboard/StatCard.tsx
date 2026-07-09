import { Card } from "../common/Card";
import "./StatCard.css";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <Card className="stat-card">
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-label">{label}</span>
      {hint && <span className="stat-card-hint">{hint}</span>}
    </Card>
  );
}
