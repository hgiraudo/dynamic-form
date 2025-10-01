import React from "react";

function ButtonGroup({ options, value, onChange }) {
  return (
    <div className="flex space-x-4">
      {options.map((option) => (
        <button
          type="button"
          key={option}
          onClick={() => onChange(option)}
          className={`px-4 py-2 rounded-lg border transition ${
            value === option
              ? "bg-brand-secondary text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default ButtonGroup;
