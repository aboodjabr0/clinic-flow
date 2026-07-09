import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import "./Select.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, id, className, children, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="input-group">
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={["select", error ? "input-error" : "", className].filter(Boolean).join(" ")}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
