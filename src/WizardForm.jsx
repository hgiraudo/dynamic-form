import React, { useState, useEffect } from "react";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";
import formConfig from "./formConfig.json";
import * as fieldMappers from "./fieldMappers";

function WizardForm() {
  // Inicializamos formData con los valores por defecto
  const initializeFormData = () => {
    const initialData = {};
    formConfig.steps.forEach((step) => {
      step.fields.forEach((field) => {
        if (field.default !== undefined) {
          initialData[field.name] =
            field.default === "today" && field.type === "date"
              ? new Date().toISOString().split("T")[0]
              : field.default;
        } else if (field.type === "checkbox") {
          initialData[field.name] = false;
        } else {
          initialData[field.name] = "";
        }
      });
    });
    return initialData;
  };

  const [formData, setFormData] = useState(initializeFormData);
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = formConfig.steps[stepIndex];

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getMappedFormData = () => {
    let mappedData = { ...formData };
    formConfig.steps.forEach((step) => {
      step.fields.forEach((field) => {
        if (field.mapper) {
          const mapperFn = fieldMappers[field.mapper];
          if (mapperFn) {
            mappedData = mapperFn(mappedData);
          }
        }
      });
    });
    return mappedData;
  };

  const renderField = (field) => {
    const value = formData[field.name];
    switch (field.type) {
      case "text":
      case "email":
      case "date":
        return (
          <div className="mb-4" key={field.name}>
            <label className="block text-allaria-light-blue mb-2">
              {field.label}
            </label>
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        );
      case "checkbox":
        return (
          <div className="mb-4 flex items-center space-x-2" key={field.name}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              className="h-4 w-4 text-allaria-blue border-gray-300 rounded"
            />
            <span>{field.label}</span>
          </div>
        );
      case "button-group":
        return (
          <div className="mb-4" key={field.name}>
            <label className="block text-allaria-light-blue mb-2">
              {field.label}
            </label>
            <div className="flex space-x-2">
              {field.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`px-4 py-2 rounded border ${
                    value === opt
                      ? "bg-allaria-light-blue text-blue-100"
                      : "bg-white text-allaria-light-blue border-gray-400 hover:bg-gray-100"
                  }`}
                  onClick={() => handleChange(field.name, opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex max-w-7xl mx-auto p-0 border rounded shadow-lg overflow-hidden h-[80vh]">
      {/* Barra lateral */}
      <div className="w-80 bg-allaria-blue flex flex-col text-blue-200">
        <div className="p-6 text-center">
          <img
            src="/img/allaria-logo-blanco.svg"
            alt="Allaria Logo"
            className="h-12 mx-auto"
          />
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <ul>
            {formConfig.steps.map((step, idx) => {
              const isActive = idx === stepIndex;
              return (
                <li
                  key={idx}
                  onClick={() => setStepIndex(idx)}
                  className={`cursor-pointer px-5 py-3 mb-2 flex items-center transition
                  border-l-4 border-transparent ${
                    isActive
                      ? "bg-allaria-light-blue text-blue-100 font-semibold border-allaria-light-blue"
                      : "hover:bg-allaria-light-blue/50 text-blue-200"
                  }`}
                >
                  {step.icon && (
                    <CIcon icon={Icons[step.icon]} className="w-5 h-5 mr-3" />
                  )}
                  {step.title}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Contenido del paso */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-2xl font-semibold text-allaria-blue mb-6">
            {currentStep.title}
          </h2>

          <div className="space-y-4">
            {currentStep.fields.map((field) => renderField(field))}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStepIndex(Math.max(stepIndex - 1, 0))}
              disabled={stepIndex === 0}
              className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50"
            >
              Anterior
            </button>

            <button
              onClick={() =>
                setStepIndex(
                  Math.min(stepIndex + 1, formConfig.steps.length - 1)
                )
              }
              disabled={stepIndex === formConfig.steps.length - 1}
              className="px-4 py-2 bg-allaria-blue text-white rounded-lg hover:bg-allaria-light-blue disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>

          {stepIndex === formConfig.steps.length - 1 && (
            <pre className="mt-6 p-4 bg-gray-100 border rounded overflow-x-auto">
              {JSON.stringify(getMappedFormData(), null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default WizardForm;
