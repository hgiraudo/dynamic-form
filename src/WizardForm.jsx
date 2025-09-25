import React, { useState, useRef } from "react";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";
import formConfig from "./formConfig.json";
import appConfig from "./appConfig.json"; // 🔹 Config con showJsonOnReview
import * as fieldMappers from "./fieldMappers";
import * as fieldFormatters from "./fieldFormatters";
import { formatDateDDMMYYYY } from "./utils";

function WizardForm() {
  // 🔹 Inicialización de formData con valores por defecto
  const initializeFormData = () => {
    const initialData = {};
    formConfig.steps.forEach((step) => {
      step.fields.forEach((field) => {
        if (field.default !== undefined) {
          initialData[field.name] =
            field.default === "today" && field.type === "date"
              ? new Date().toISOString().split("T")[0]
              : field.default ?? (field.type === "checkbox" ? false : "");
        } else if (field.type === "checkbox") {
          initialData[field.name] = false;
        } else {
          initialData[field.name] = "";
        }
      });
    });
    return initialData;
  };

  const [formData, setFormData] = useState(initializeFormData());
  const [stepIndex, setStepIndex] = useState(0);
  const fileInputRef = useRef(null);

  const currentStep = formConfig.steps[stepIndex];

  // 🔹 Actualizar valor normal
  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Actualizar valor con formatters y mappers
  const handleChangeWithFormatter = (field, rawValue) => {
    let value = rawValue;

    if (field.formatter && fieldFormatters[field.formatter]) {
      value = fieldFormatters[field.formatter](rawValue);
    }

    setFormData((prev) => {
      let updated = { ...prev, [field.name]: value };

      if (field.mapper && fieldMappers[field.mapper]) {
        updated = fieldMappers[field.mapper](updated);
      }

      return updated;
    });
  };

  // 🔹 Obtener datos mapeados para revisión
  const getMappedFormData = () => {
    let mappedData = { ...formData };

    formConfig.steps.forEach((step) => {
      step.fields.forEach((field) => {
        if (field.mapper) {
          const mapperFn = fieldMappers[field.mapper];
          if (mapperFn) {
            mappedData = mapperFn(mappedData, field.name);
          }
        } else if (field.type === "date" && mappedData[field.name]) {
          mappedData[field.name] = formatDateDDMMYYYY(mappedData[field.name]);
        }
      });
    });

    return mappedData;
  };

  // 🔹 Render de los campos
  const renderField = (field) => {
    if (field.visibleIf) {
      const { field: depField, value } = field.visibleIf;
      if (formData[depField] !== value) return null;
    }

    let value = formData[field.name];
    if (value === undefined) {
      value =
        field.default === "today" && field.type === "date"
          ? new Date().toISOString().split("T")[0]
          : field.default ?? (field.type === "checkbox" ? false : "");
    }

    switch (field.type) {
      case "text":
      case "email":
      case "date":
      case "tel":
        return (
          <div className="mb-2" key={field.name}>
            <label className="block text-allaria-light-blue mb-1">
              {field.label}
            </label>
            <input
              type={field.type}
              value={value}
              placeholder={field.placeholder || ""}
              onChange={(e) => handleChangeWithFormatter(field, e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
              disabled={field.disabled}
            />
          </div>
        );

      case "textarea":
        return (
          <div className="mb-2" key={field.name}>
            <label className="block text-allaria-light-blue mb-1">
              {field.label}
            </label>
            <textarea
              value={value}
              placeholder={field.placeholder || ""}
              rows={field.rows || 3}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        );

      case "checkbox":
        return (
          <div className="mb-2 flex items-center space-x-2" key={field.name}>
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
          <div className="mb-2" key={field.name}>
            <label className="block text-allaria-light-blue mb-1">
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

  // 🔹 Acciones de revisión
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formulario.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current.click();

  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setFormData(data);
      } catch {
        alert("El archivo no es un JSON válido ❌");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => setFormData(initializeFormData());

  console.log(formData);

  return (
    <div className="flex max-w-7xl mx-auto p-0 border rounded shadow-lg overflow-hidden h-[80vh]">
      {/* 🔹 Barra lateral */}
      <div className="w-80 bg-allaria-blue flex flex-col text-blue-200 p-2 pl-4">
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
                  className={`cursor-pointer px-6 py-3 mb-2 flex items-center transition border-l-4 border-transparent ${
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

      {/* 🔹 Contenido */}
      <div className="flex-1 overflow-y-auto bg-white p-4">
        <div className="p-8">
          <h2 className="text-2xl font-semibold text-allaria-blue mb-6">
            {currentStep.title}
          </h2>

          {/* 🔹 Render dinámico de campos */}
          {stepIndex !== formConfig.steps.length - 1 && (
            <div className="space-y-4">
              {currentStep.fields.map((field) => renderField(field))}
            </div>
          )}

          {/* 🔹 Botones navegación (excepto en Revisión) */}
          {stepIndex !== formConfig.steps.length - 1 && (
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
                className="px-4 py-2 bg-allaria-blue text-white rounded-lg hover:bg-allaria-light-blue"
              >
                Siguiente
              </button>
            </div>
          )}

          {/* 🔹 Revisión */}
          {stepIndex === formConfig.steps.length - 1 && (
            <>
              <div className="rounded-lg overflow-hidden text-sm">
                {formConfig.steps
                  .slice(0, -1) // 👈 excluimos el último paso
                  .map((step, stepIdx) => (
                    <div key={stepIdx} className="mb-6">
                      {/* 🔹 Encabezado del paso */}
                      <h3 className="text-lg font-semibold text-allaria-blue mb-2 border-b pb-1">
                        {step.title}
                      </h3>

                      {/* 🔹 Campos del paso */}
                      {step.fields.map((field, idx) => (
                        <div
                          key={field.name}
                          className={`grid grid-cols-2 gap-4 px-4 py-2 items-center ${
                            idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                          }`}
                        >
                          <span className="font-medium text-allaria-blue text-right pr-4">
                            {field.label}
                          </span>
                          <span className="text-gray-700 break-words">
                            {String(getMappedFormData()[field.name] ?? "")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>

              {appConfig.showJsonOnReview && (
                <>
                  {console.log("📄 JSON en revisión:", getMappedFormData())}
                  <pre className="mt-6 p-4 bg-gray-100 border rounded overflow-x-auto text-xs">
                    {JSON.stringify(getMappedFormData(), null, 2)}
                  </pre>
                </>
              )}

              {/* 🔹 Botones acciones */}
              <div className="flex justify-between gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-allaria-blue text-white rounded-lg hover:bg-allaria-light-blue"
                >
                  <CIcon icon={Icons.cilSave} className="w-5 h-5 mr-2" />
                  Descargar JSON
                </button>

                <button
                  type="button"
                  onClick={handleImportClick}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  <CIcon icon={Icons.cilCloudUpload} className="w-5 h-5 mr-2" />
                  Importar JSON
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept="application/json"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                >
                  <CIcon icon={Icons.cilTrash} className="w-5 h-5 mr-2" />
                  Borrar Todo
                </button>

                <button
                  type="button"
                  onClick={() => alert("Firmar 🚀")}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CIcon icon={Icons.cilFile} className="w-5 h-5 mr-2" />
                  Firmar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WizardForm;
