import React, { useState } from "react";
import { isValidEmail } from "../../utils/fieldValidators";

export default function EmailInputField({
  value,
  onChange,
  disabled,
  placeholder,
  className,
  invalidClassName,
  isInvalid: isInvalidProp,
}) {
  const [internalInvalid, setInternalInvalid] = useState(false);
  const invalid = isInvalidProp !== undefined ? isInvalidProp : internalInvalid;

  const handleChange = (e) => {
    onChange(e.target.value);
    if (internalInvalid) setInternalInvalid(false);
  };

  const handleBlur = () => {
    setInternalInvalid(!!value && !isValidEmail(value));
  };

  return (
    <div>
      <input
        type="text"
        value={value || ""}
        placeholder={placeholder || ""}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={`${className ?? ""} ${invalid ? (invalidClassName ?? "") : ""}`}
      />
      {invalid && (
        <span className="text-xs text-red-500 mt-0.5 block">Valor inválido</span>
      )}
    </div>
  );
}
