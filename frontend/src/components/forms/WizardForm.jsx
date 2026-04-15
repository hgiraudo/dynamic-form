import React, { useState, useRef } from "react";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";
import formConfig from "../../config/formConfig.json";
import appConfig from "../../config/appConfig.json";
import * as fieldMappers from "../../utils/fieldMappers";
import * as fieldFormatters from "../../utils/fieldFormatters";
import { formatDateDDMMYYYY, parseDateDDMMYYYY } from "../../utils/utils";
import config from "../../../../shared/config.general.js";
import pdfConfig from "../../config/pdfConfig.json";

/**
 * Genera los archivos PDF y JSON a partir del formulario mapeado.
 * Usa las rutas configuradas en pdfConfig.json
 */
export async function generatePdfFiles(getMappedFormData) {
  console.log("[PDF Helper] Iniciando generación de archivos...");

  const pdfJson = getMappedFormData();
  const pdfUrl = `${pdfConfig.templatePath}${pdfConfig.templatePdf}`;
  console.log("[PDF Helper] Descargando template PDF:", pdfUrl);

  const pdfResp = await fetch(pdfUrl);

  if (!pdfResp.ok) {
    const errorText = await pdfResp.text();
    console.error(
      "[PDF Helper] Error al descargar template PDF:",
      pdfResp.status,
      errorText.slice(0, 200)
    );
    throw new Error(`Error al descargar template PDF: ${pdfResp.statusText}`);
  }

  const pdfBlob = await pdfResp.blob();
  const pdfFile = new File([pdfBlob], pdfConfig.templatePdf, {
    type: "application/pdf",
  });

  const jsonFile = new File([JSON.stringify(pdfJson)], pdfConfig.jsonFileName, {
    type: "application/json",
  });

  console.log("[PDF Helper] Archivos generados:", {
    pdfFile: pdfFile.name,
    jsonFile: jsonFile.name,
  });

  return { pdfFile, jsonFile, pdfJson };
}

import { buildTransactionJson } from "../../utils/buildTransactionJson.js";
import { AnimatePresence } from "framer-motion";
import { brandConfig } from "../../branding/brandConfig";

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
  const [modalError, setModalError] = useState(null); // 🆕 para guardar el mensaje de error
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
        updated = fieldMappers[field.mapper](updated, field.name);
      }
      return updated;
    });
  };

  // 🔹 Importar JSON y normalizar
  const handleImport = (importedData) => {
    console.log("handleImport recibido:", importedData);

    let normalizedData = { ...importedData };

    formConfig.steps.forEach((step) => {
      step.fields.forEach((field) => {
        // Si el campo es tipo "date", convertirlo a formato válido HTML5 (YYYY-MM-DD)
        if (field.type === "date" && normalizedData[field.name]) {
          const oldValue = normalizedData[field.name];
          normalizedData[field.name] = parseDateDDMMYYYY(
            normalizedData[field.name]
          );
          console.log(
            `Campo date '${field.name}': '${oldValue}' → '${
              normalizedData[field.name]
            }'`
          );
        }

        // Si es checkbox, convertir "/" → true y "" → false
        if (field.type === "checkbox") {
          const oldValue = normalizedData[field.name];
          normalizedData[field.name] = normalizedData[field.name] === "/";
          console.log(
            `Campo checkbox '${field.name}': '${oldValue}' → ${
              normalizedData[field.name]
            }`
          );
        }
      });
    });

    console.log("Datos normalizados finales:", normalizedData);
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
      a.download = `${brandConfig.downloadFilename.toLowerCase()}.json`;
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
      const depValue = formData[depField];

      // Si value es cadena vacía, interpretamos "mostrar si el otro campo NO está vacío"
      if (value === "") {
        if (!depValue) return null;
      } else {
        if (depValue !== value) return null;
      }
    }

    // Solo calculamos value si el campo tiene "name"
    let value = undefined;
    if (field.name) {
      value = formData[field.name];
      if (value === undefined) {
        value =
          field.default === "today" && field.type === "date"
            ? new Date().toISOString().split("T")[0]
            : field.default ?? (field.type === "checkbox" ? false : "");
      }
    }

    let isEnabled = true;

    if (field.enabledIf) {
      const { field: depField, value } = field.enabledIf;
      const depValue = formData[depField];

      if (value === "") {
        isEnabled = !!depValue;
      } else {
        isEnabled = depValue === value;
      }
    }

    switch (field.type) {
      case "email":
      case "date":
      case "text":
      case "tel":
        return (
          <div className="mb-2" key={field.name}>
            <label className="block text-brand-secondary mb-1">
              {field.label}
            </label>
            <input
              type={field.type}
              value={isEnabled ? value : ""}
              placeholder={field.placeholder || ""}
              onChange={(e) => handleChangeWithFormatter(field, e.target.value)}
              className={`w-full p-3 border rounded focus:outline-none focus:ring-2 ${
                field.disabled || !isEnabled
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white border-gray-300 focus:ring-gray-300"
              }`}
              disabled={field.disabled || !isEnabled}
            />
          </div>
        );

      case "textarea":
        return (
          <div className="mb-2" key={field.name}>
            <label className="block text-brand-secondary mb-1">
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
              className="h-4 w-4 text-brand-primary border-gray-300 rounded"
            />
            <span>{field.label}</span>
          </div>
        );

      case "info":
        return (
          <div
            className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded"
            key={field.name}
          >
            {field.label && (
              <h3 className="text-md font-semibold text-brand-secondary mb-2">
                {field.label}
              </h3>
            )}
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {field.content}
            </div>
          </div>
        );

      case "button-group":
        return (
          <div className="mb-2" key={field.name}>
            <label className="block text-brand-secondary mb-1">
              {field.label}
            </label>
            <div className="flex space-x-2">
              {field.options.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  className={`px-4 py-2 rounded border ${
                    (value ?? field.options[0]) === opt
                      ? "bg-brand-secondary text-blue-100"
                      : "bg-white text-brand-secondary border-gray-400 hover:bg-gray-100"
                  }`}
                  onClick={() => handleChange(field.name, opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );

      case "subtitle":
        return (
          <div className="mt-4 mb-2" key={field.name || field.label}>
            <h4 className="text-base font-semibold text-brand-secondary whitespace-pre-line">
              {field.content}
            </h4>
          </div>
        );

      case "comment":
        return (
          <div className="mt-4 mb-2" key={field.name || field.label}>
            <h4 className="text-base text-brand-secondary whitespace-pre-line">
              {field.content}
            </h4>
          </div>
        );

      case "group":
        return (
          <div
            key={field.label}
            className="mt-6 mb-4 p-4 bg-gray-100 border border-gray-300 rounded-xl shadow-sm"
          >
            <h3 className="text-lg font-semibold text-brand-secondary mb-1">
              {field.label}
            </h3>
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
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
      setModalError(null); // 🆕 resetear error
      setShowModal(true);
      setModalLoading(true);

      // 🔹 0. Chequear que el backend está levantado
      const healthUrl = `${config.backend.baseUrl}${config.backend.healthEndpoint}`;
      console.log("healthUrl: " + healthUrl);
      const healthResp = await fetch(healthUrl);
      if (!healthResp.ok) throw new Error("Servidor no disponible");
      const healthData = await healthResp.json();
      if (healthData.status !== "ok")
        throw new Error("Servidor no respondió correctamente");

      // 🔹 1. Generar PDF y transactionJson
      const pdfJson = getMappedFormData();
      const pdfTemplate = pdfConfig.templatePdf; // nombre dinámico
      console.log("pdfTemplate:" + pdfTemplate);
      const pdfResp = await fetch(`/form/${pdfTemplate}`);
      const pdfBlob = await pdfResp.blob();
      const pdfFile = new File([pdfBlob], pdfTemplate, {
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
      if (!fillResp.ok) throw new Error("Error al generar PDF");
      const fillData = await fillResp.json();
      const transactionJson = buildTransactionJson(fillData.base64, formData);

      // 🔹 2. Enviar transacción al backend
      const signUrl = `${config.backend.baseUrl}${config.backend.signEndpoint}`;
      const signResp = await fetch(signUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OneSpan-API-Key": import.meta.env.VITE_ONESPAN_API_KEY,
        },
        body: JSON.stringify(transactionJson),
      });
      if (!signResp.ok) throw new Error("Error al enviar transacción");
      const signData = await signResp.json();

      // 🔹 3. Solicitar URL de firma al backend
      const getUrl = `${config.backend.baseUrl}${config.backend.getSigningUrlEndpoint}`;
      const urlResp = await fetch(getUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OneSpan-API-Key": import.meta.env.VITE_ONESPAN_API_KEY,
        },
        body: JSON.stringify({ packageId: signData.id }),
      });
      if (!urlResp.ok) throw new Error("Error al obtener la URL de firma");
      const urlData = await urlResp.json();

      // 🔹 4. Mostrar modal final
      setSigningUrl(urlData.signingUrl);
      setModalLoading(false);
    } catch (err) {
      console.error("❌ Error en handleSign:", err);
      setModalLoading(false);
      setModalError(err.message || "Error al procesar la firma");
      setShowModal(true); // 🔹 mantener modal abierto para mostrar error
    }
  };

  return (
    <div className="flex max-w-7xl mx-auto p-0 border rounded shadow-lg overflow-hidden h-[80vh]">
      {/* Sidebar */}
      <div className="w-80 bg-brand-primary flex flex-col text-blue-200 p-2 pl-4">
        <div className="p-6 text-center">
          <img
            src={brandConfig.logos.white}
            alt={`${brandConfig.name} Logo`}
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
                      ? "bg-brand-secondary text-blue-100 font-semibold border-brand-secondary"
                      : "hover:bg-brand-secondary/50 text-blue-200"
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
          <h2 className="text-2xl font-semibold text-brand-primary mb-6">
            {currentStep.description}
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
                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary"
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
                  <div key={`${step.title}-${stepIdx}`} className="mb-6">
                    <h3 className="text-lg font-semibold text-brand-primary mb-2 border-b pb-1 text-center">
                      {step.title}
                    </h3>

                    {step.fields
                      .filter((field) => !field.hideOnRevision)
                      .map((field, idx) => {
                        // zebra strip
                        const rowBg = idx % 2 === 0 ? "bg-gray-50" : "bg-white";

                        // 🟦 Mostrar encabezado para los type=group
                        if (field.type === "group") {
                          return (
                            <div
                              key={`${step.title}-${field.label}-${idx}`}
                              className={`px-4 py-2 ${rowBg}`}
                            >
                              <span className="font-semibold text-center w-full block text-gray-800">
                                {field.label}
                              </span>
                            </div>
                          );
                        }

                        // 🔸 Campos normales
                        let displayValue =
                          getMappedFormData()[field.name] ?? "";
                        if (field.type === "checkbox") {
                          displayValue = formData[field.name] ? "Sí" : "No";
                        }

                        return (
                          <div
                            key={`${step.title}-${field.name}-${idx}`}
                            className={`grid grid-cols-2 gap-4 px-4 py-2 items-center ${rowBg}`}
                          >
                            <span className="font-medium text-brand-primary text-right pr-4">
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
                  onClick={handleExport}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary"
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
                        handleImport(importedData);
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
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-white rounded-2xl p-10 w-96 max-w-full text-center relative shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {modalLoading ? (
                <div className="flex flex-col items-center">
                  <svg
                    className="animate-spin h-16 w-16 text-brand-primary mb-4"
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
                  <p className="text-brand-primary font-semibold text-lg">
                    Creando transacción, por favor espere...
                  </p>
                </div>
              ) : modalError ? (
                <div>
                  <img
                    src={brandConfig.logos.color}
                    alt={`${brandConfig.name} Logo`}
                    className="h-16 mx-auto mb-4"
                  />
                  <h3 className="text-2xl font-bold text-orange-800 mb-4 p-4">
                    Error al crear la transacción
                  </h3>
                  <p className="mb-6">
                    Compruebe que el servidor está funcionando ({modalError})
                  </p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <div>
                  <img
                    src={brandConfig.logos.color}
                    alt={`${brandConfig.name} Logo`}
                    className="h-16 mx-auto mb-4"
                  />
                  <h3 className="text-2xl font-bold text-brand-primary mb-6">
                    Transacción creada correctamente
                  </h3>
                  <button
                    onClick={() => window.open(signingUrl, "_blank")}
                    className="px-8 py-4 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary text-lg font-semibold"
                  >
                    Ir a Firmar!
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WizardForm;
