import type { ClinicSettings } from "../../../types/clinicSettings";

interface ClinicPrintHeaderProps {
  clinic: ClinicSettings | null;
}

export function ClinicPrintHeader({ clinic }: ClinicPrintHeaderProps) {
  const name = clinic?.clinicName ?? "ClinicFlow";
  const badgeLetter = name.trim().charAt(0).toUpperCase() || "C";
  const metaLine = [clinic?.phoneNumber, clinic?.email, clinic?.address].filter(Boolean).join(" · ");

  return (
    <div className="print-clinic-header">
      <div className="print-clinic-badge" aria-hidden="true">
        {badgeLetter}
      </div>
      <div>
        <p className="print-clinic-name">{name}</p>
        {metaLine && <p className="print-clinic-meta">{metaLine}</p>}
      </div>
    </div>
  );
}
