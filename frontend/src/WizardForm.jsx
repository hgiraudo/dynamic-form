import React, { useState, useRef } from "react";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";
import formConfig from "./formConfig.json";
import appConfig from "./appConfig.json";
import * as fieldMappers from "./fieldMappers";
import * as fieldFormatters from "./fieldFormatters";
import { formatDateDDMMYYYY, parseDateDDMMYYYY } from "./utils/utils";
import config from "../../shared/config.general.js";
import { buildTransactionJson } from "./utils/buildTransactionJson.js";
import { motion, AnimatePresence } from "framer-motion";

function WizardForm() {
  const [formData, setFormData] = useState(() => {
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
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false); // 🔹 indica que está creando la transacción
  const [signingUrl, setSigningUrl] = useState("");
  const fileInputRef = useRef(null);
  const currentStep = formConfig.steps[stepIndex];

  /* ============================================================
     HANDLE CHANGE
  ============================================================ */
  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

  // 🔹 Importar JSON y normalizar
  const handleImport = (importedData) => {
    let normalizedData = { ...importedData };

    formConfig.steps.forEach((step) => {
      step.fields.forEach((field) => {
        // Si el campo es tipo "date", convertirlo a formato válido HTML5 (YYYY-MM-DD)
        if (field.type === "date" && normalizedData[field.name]) {
          normalizedData[field.name] = parseDateDDMMYYYY(
            normalizedData[field.name]
          );
        }

        // Si es checkbox, convertir "/" → true y "" → false
        if (field.type === "checkbox") {
          normalizedData[field.name] = normalizedData[field.name] === "/";
        }
      });
    });

    setFormData(normalizedData);
  };

  const getMappedFormData = () => {
    let mappedData = { ...formData };

    formConfig.steps.forEach((step) => {
      step.fields.forEach((field) => {
        if (field.mapper && fieldMappers[field.mapper]) {
          // 🔹 Aplica mapper si está definido
          mappedData = fieldMappers[field.mapper](mappedData, field.name);
        } else if (field.type === "date" && mappedData[field.name]) {
          // 🔹 Exportar fecha en formato DD-MM-YYYY
          mappedData[field.name] = formatDateDDMMYYYY(mappedData[field.name]);
        } else if (field.type === "checkbox") {
          // 🔹 Exportar checkbox como "/" o ""
          mappedData[field.name] = mappedData[field.name] ? "/" : "";
        }
      });
    });

    return mappedData;
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(getMappedFormData(), null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "persona-juridica-allaria.json";
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Error exportando JSON:", err);
      alert("No se pudo exportar el JSON");
    }
  };

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

  /* ============================================================
     HANDLE SIGN
  ============================================================ */
  const handleSign = async () => {
    try {
      setShowModal(true);
      setModalLoading(true); // 🔹 mostrar modal de espera

      // 1. Generar PDF y transactionJson
      const pdfJson = getMappedFormData();
      const pdfResp = await fetch("/form/persona-juridica.pdf");
      const pdfBlob = await pdfResp.blob();
      const pdfFile = new File([pdfBlob], "persona-juridica.pdf", {
        type: "application/pdf",
      });
      const jsonFile = new File([JSON.stringify(pdfJson)], "datos.json", {
        type: "application/json",
      });

      const formDataUpload = new FormData();
      formDataUpload.append("pdf", pdfFile);
      formDataUpload.append("json", jsonFile);
      formDataUpload.append("responseType", "base64");

      const fillPdfUrl = `${config.backend.baseUrl}${config.backend.fillPdfEndpoint}`;
      const fillResp = await fetch(fillPdfUrl, {
        method: "POST",
        body: formDataUpload,
      });
      const fillData = await fillResp.json();
      const transactionJson = buildTransactionJson(fillData.base64, formData);

      // 2. Enviar transacción al backend
      const signUrl = `${config.backend.baseUrl}${config.backend.signEndpoint}`;
      const signResp = await fetch(signUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionJson),
      });
      const signData = await signResp.json();

      // 3. Solicitar URL de firma al backend
      const getUrl = `${config.backend.baseUrl}${config.backend.getSigningUrlEndpoint}`;
      const urlResp = await fetch(getUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: signData.id }),
      });
      if (!urlResp.ok) throw new Error("Error al obtener la URL de firma");
      const urlData = await urlResp.json();

      // 4. Mostrar modal final
      setSigningUrl(urlData.signingUrl);
      setModalLoading(false); // 🔹 ya no está cargando
    } catch (err) {
      console.error("❌ Error en handleSign:", err);
      setShowModal(false);
      alert("Error al procesar la firma");
    }
  };

  return (
    <div className="flex max-w-7xl mx-auto p-0 border rounded shadow-lg overflow-hidden h-[80vh]">
      {/* Sidebar */}
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

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto bg-white p-4">
        <div className="p-8">
          <h2 className="text-2xl font-semibold text-allaria-blue mb-6">
            {currentStep.title}
          </h2>

          {/* Render dinámico de campos */}
          {stepIndex !== formConfig.steps.length - 1 && (
            <div className="space-y-4">
              {currentStep.fields.map((field) => renderField(field))}
            </div>
          )}

          {/* Botones navegación */}
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

          {/* Revisión */}
          {stepIndex === formConfig.steps.length - 1 && (
            <>
              <div className="rounded-lg overflow-hidden text-sm">
                {formConfig.steps.slice(0, -1).map((step, stepIdx) => (
                  <div key={stepIdx} className="mb-6">
                    <h3 className="text-lg font-semibold text-allaria-blue mb-2 border-b pb-1 text-center">
                      {step.title}
                    </h3>

                    {step.fields
                      .filter((field) => !field.hideOnRevision)
                      .map((field, idx) => {
                        let displayValue =
                          getMappedFormData()[field.name] ?? "";
                        // 👇 Mostrar Sí/No en la revisión si es checkbox
                        if (field.type === "checkbox") {
                          displayValue = formData[field.name] ? "Sí" : "No";
                        }

                        return (
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
                              {displayValue}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>

              {appConfig.showJsonOnRevision && (
                <pre className="mt-6 p-4 bg-gray-100 border rounded overflow-x-auto text-xs">
                  {JSON.stringify(getMappedFormData(), null, 2)}
                </pre>
              )}

              {/* Botones acciones */}
              <div className="flex justify-between gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleExport} // 👈 ahora usa la función real
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-allaria-blue text-white rounded-lg hover:bg-allaria-light-blue"
                >
                  <CIcon icon={Icons.cilSave} className="w-5 h-5 mr-2" />
                  Descargar JSON
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  <CIcon icon={Icons.cilCloudUpload} className="w-5 h-5 mr-2" />
                  Importar JSON
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const importedData = JSON.parse(ev.target.result);
                        handleImport(importedData); // 🔹 ahora usa tu función
                      } catch {
                        alert("Archivo JSON inválido ❌");
                      }
                    };
                    reader.readAsText(file);
                  }}
                  accept="application/json"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => setFormData({})}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                >
                  <CIcon icon={Icons.cilTrash} className="w-5 h-5 mr-2" />
                  Borrar Todo
                </button>

                <button
                  type="button"
                  onClick={handleSign}
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

      {/* MODAL */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)} // 🔹 cerrar al click fuera
          >
            <div
              className="bg-white rounded-2xl p-10 w-96 max-w-full text-center relative shadow-lg"
              onClick={(e) => e.stopPropagation()} // 🔹 evitar que el click dentro cierre
            >
              {modalLoading ? (
                <>
                  <div className="flex flex-col items-center">
                    <svg
                      className="animate-spin h-16 w-16 text-allaria-blue mb-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    <p className="text-allaria-blue font-semibold text-lg">
                      Creando transacción, por favor espere...
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src="/img/allaria-logo-color.svg"
                    alt="Allaria Logo"
                    className="h-16 mx-auto mb-4"
                  />
                  <br />
                  <h3 className="text-2xl font-bold text-allaria-blue mb-6">
                    Transacción creada correctamente
                  </h3>
                  <br />
                  <button
                    onClick={() => window.open(signingUrl, "_blank")}
                    className="px-8 py-4 bg-allaria-blue text-white rounded-lg hover:bg-allaria-light-blue text-lg font-semibold"
                  >
                    Ir a Firmar!
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WizardForm;
