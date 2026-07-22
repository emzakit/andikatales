import { useState } from "react";
import type { Limits } from "../types";

interface Props {
  titlePlaceholder: string;
  bodyPlaceholder: string;
  submitLabel: string;
  limits: Limits;
  autoFocus?: boolean;
  onSubmit: (title: string, body: string) => Promise<void>;
  onCancel?: () => void;
}

export function NodeForm({
  titlePlaceholder,
  bodyPlaceholder,
  submitLabel,
  limits,
  autoFocus,
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await onSubmit(title, body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const bodyCount = body.trim().length;

  return (
    <div className="node-form">
      <input
        type="text"
        value={title}
        maxLength={limits.title}
        placeholder={titlePlaceholder}
        autoFocus={autoFocus}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        value={body}
        maxLength={limits.bodyMax}
        placeholder={bodyPlaceholder}
        rows={7}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="node-form-footer">
        <span className={`char-count${bodyCount > 0 && bodyCount < limits.bodyMin ? " short" : ""}`}>
          {bodyCount}/{limits.bodyMax}
        </span>
        <div className="node-form-actions">
          {onCancel && (
            <button className="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          )}
          <button
            className="primary"
            onClick={submit}
            disabled={busy || !title.trim() || bodyCount < limits.bodyMin}
          >
            {busy ? "Weaving…" : submitLabel}
          </button>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
