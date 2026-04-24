import React, { useRef } from "react";
import MaskedInputField from "./MaskedInputField";

function isValidDate(ddmmyyyy) {
  if (!ddmmyyyy) return false;
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) return false;
  const d = Number(parts[0]), m = Number(parts[1]), y = Number(parts[2]);
  if (m < 1 || m > 12 || d < 1 || y < 1) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// "15/01/2024" or "15-01-2024" → "2024-01-15" (ISO for the hidden input)
function toISO(ddmmyyyy) {
  if (!ddmmyyyy) return "";
  const sep = ddmmyyyy.includes("/") ? "/" : "-";
  const parts = ddmmyyyy.split(sep);
  if (parts.length !== 3 || parts[2].length < 4) return "";
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// "2024-01-15" → "15/01/2024"
function fromISO(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function DateInputField({
  value,
  onChange,
  disabled,
  placeholder,
  inputClassName,
  invalidClassName,
}) {
  const pickerRef = useRef();

  return (
    <div className="relative">
      <MaskedInputField
        value={value}
        onChange={onChange}
        mask="##/##/####"
        disabled={disabled}
        placeholder={placeholder || "DD/MM/AAAA"}
        className={`${inputClassName ?? ""} pr-10`}
        invalidClassName={invalidClassName}
        validate={isValidDate}
      />

      {/* Calendar icon button — opens the native date picker via showPicker() */}
      <button
        type="button"
        disabled={disabled}
        tabIndex={-1}
        onClick={() => pickerRef.current?.showPicker?.()}
        className="absolute right-0 inset-y-0 w-10 flex items-center justify-center text-gray-400 hover:text-brand-primary transition-colors disabled:opacity-30"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Hidden date input — provides the native calendar picker UI */}
      <input
        ref={pickerRef}
        type="date"
        value={toISO(value)}
        onChange={(e) => e.target.value && onChange(fromISO(e.target.value))}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
    </div>
  );
}
