'use client';

import { useId, useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible label (visually hidden — the placeholder is the visible label). */
  label: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}

/** Password hidden → the Figma "peek" glyph (node 143:247): a closed eyelid with
 * lashes. Exact paths exported from Figma, recoloured to currentColor. */
function ClosedEyeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.00012 7C6.00012 9 10.0001 9 13.0001 7"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M2.07706 9.38876C1.93634 9.62636 2.01488 9.93305 2.25248 10.0738C2.49007 10.2145 2.79676 10.1359 2.93748 9.89835L2.07706 9.38876ZM3.21652 7.4648L2.07706 9.38876L2.93748 9.89835L4.07694 7.97439L3.21652 7.4648Z"
        fill="currentColor"
      />
      <path
        d="M4.67518 10.7114C4.63082 10.984 4.81581 11.2409 5.08837 11.2852C5.36092 11.3296 5.61783 11.1446 5.66219 10.872L4.67518 10.7114ZM5.12951 7.9197L4.67518 10.7114L5.66219 10.872L6.11652 8.08033L5.12951 7.9197Z"
        fill="currentColor"
      />
      <path
        d="M6.99991 11.0001C6.99989 11.2762 7.22373 11.5001 7.49988 11.5001C7.77602 11.5001 7.99989 11.2763 7.99991 11.0002L6.99991 11.0001ZM7.00007 8.50003L6.99991 11.0001L7.99991 11.0002L8.00007 8.5001L7.00007 8.50003Z"
        fill="currentColor"
      />
      <path
        d="M10.0097 11.0981C10.0639 11.3688 10.3273 11.5445 10.5981 11.4903C10.8688 11.4361 11.0445 11.1727 10.9903 10.9019L10.0097 11.0981ZM9.50965 8.59811L10.0097 11.0981L10.9903 10.9019L10.4902 8.40197L9.50965 8.59811Z"
        fill="currentColor"
      />
      <path
        d="M12.5902 10.2866C12.7484 10.5129 13.0601 10.5681 13.2865 10.4099C13.5128 10.2517 13.568 9.93999 13.4098 9.71366L12.5902 10.2866ZM11.1922 8.28658L12.5902 10.2866L13.4098 9.71366L12.0118 7.71365L11.1922 8.28658Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Password shown → an open eye. */
function OpenEyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

/** Password field with a show/hide visibility toggle (auth criterion 1.4). */
export function PasswordInput({
  value,
  onChange,
  label,
  name = 'password',
  placeholder,
  autoComplete = 'current-password',
  error,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div className="field">
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <div className="password-input">
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder ?? label}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((shown) => !shown)}
        >
          {visible ? <OpenEyeIcon /> : <ClosedEyeIcon />}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
