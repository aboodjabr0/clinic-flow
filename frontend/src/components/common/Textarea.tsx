import { useId, type TextareaHTMLAttributes } from "react";
import "./Textarea.css";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, id, className, ...rest }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="input-group">
      {label && (
        <label htmlFor={textareaId} className="input-label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={["textarea", error ? "input-error" : "", className].filter(Boolean).join(" ")}
        rows={3}
        {...rest}
      />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
