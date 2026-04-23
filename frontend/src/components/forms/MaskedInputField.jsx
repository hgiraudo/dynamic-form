import React, { useState } from "react";

function applyMask(input, mask) {
  const digits = input.replace(/\D/g, "");
  let result = "";
  let di = 0;
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    if (mask[i] === "#") result += digits[di++];
    else result += mask[i];
  }
  return result;
}

const expectedDigits = (mask) => mask.split("").filter((c) => c === "#").length;

export default function MaskedInputField({
  value,
  onChange,
  mask,
  disabled,
  placeholder,
  className,
  invalidClassName,
}) {
  const [invalid, setInvalid] = useState(false);

  const handleChange = (e) => {
    onChange(applyMask(e.target.value, mask));
    if (invalid) setInvalid(false);
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
    setInvalid(count > 0 && count !== expectedDigits(mask));
  };

  return (
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
  );
}
