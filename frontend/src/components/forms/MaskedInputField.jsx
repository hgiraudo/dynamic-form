import React, { useState } from "react";
import { isValidMask } from "../../utils/fieldValidators";
import { applyMask } from "../../utils/fieldFormatters";

const expectedDigits = (mask) => mask.split("").filter((c) => c === "#").length;

export default function MaskedInputField({
  value,
  onChange,
  mask,
  disabled,
  placeholder,
  className,
  invalidClassName,
  validate,
  isInvalid: isInvalidProp,
}) {
  const [internalInvalid, setInternalInvalid] = useState(false);
  const invalid = isInvalidProp !== undefined ? isInvalidProp : internalInvalid;

  const handleChange = (e) => {
    onChange(applyMask(e.target.value, mask));
    if (internalInvalid) setInternalInvalid(false);
  };

  const handleKeyDown = (e) => {
    if (
      e.ctrlKey || e.metaKey ||
      ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End","Escape","Enter"].includes(e.key)
    ) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const handleBlur = () => {
    const count = (value || "").replace(/\D/g, "").length;
    if (count === 0) { setInternalInvalid(false); return; }
    const incomplete = !isValidMask(value, mask);
    const customInvalid = !incomplete && validate ? !validate(value) : false;
    setInternalInvalid(incomplete || customInvalid);
  };

  return (
    <div>
      <input
        type="text"
        inputMode="numeric"
        value={value || ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder || mask.replace(/#/g, "0")}
        className={`${className ?? ""} ${invalid ? (invalidClassName ?? "") : ""}`}
      />
      {invalid && (
        <span className="text-xs text-red-500 mt-0.5 block">Valor inválido</span>
      )}
    </div>
  );
}
