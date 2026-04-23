import React from "react";
import PhoneInput, { getCountries, getCountryCallingCode } from "react-phone-number-input";
import es from "react-phone-number-input/locale/es";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";

function CountrySelect({ value, onChange, labels, selectClassName }) {
  const Flag = value ? flags[value] : null;

  return (
    <div className={`relative flex items-center gap-2 pr-3 border-r border-gray-200 cursor-pointer shrink-0 ${selectClassName ?? ""}`}>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        title={value ? labels?.[value] : "Seleccionar país"}
      >
        <option value="">Internacional</option>
        {getCountries().map((cc) => (
          <option key={cc} value={cc}>
            {labels?.[cc] || cc} (+{getCountryCallingCode(cc)})
          </option>
        ))}
      </select>

      <span className="shrink-0 pointer-events-none">
        {Flag
          ? <Flag title={labels?.[value] || value} className="w-6 h-4 rounded-sm object-cover" />
          : <span className="text-gray-400 text-xs">🌐</span>
        }
      </span>
      <span className="text-sm text-gray-700 font-medium whitespace-nowrap select-none pointer-events-none">
        {value ? (labels?.[value] || value) : "Internacional"}
      </span>
      <svg className="w-3 h-3 text-gray-400 shrink-0 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

export default function PhoneInputField({
  value,
  onChange,
  disabled,
  placeholder,
  inputClassName,
  selectClassName,
}) {
  return (
    <PhoneInput
      defaultCountry="AR"
      international
      value={value || ""}
      onChange={(val) => onChange(val ?? "")}
      disabled={disabled}
      placeholder={placeholder || "9 11 1234-5678"}
      labels={es}
      countrySelectComponent={(props) => (
        <CountrySelect {...props} labels={es} selectClassName={selectClassName} />
      )}
      className="phone-input-wrapper"
      numberInputProps={{
        className: `phone-input-number ${inputClassName ?? ""}`,
      }}
    />
  );
}
