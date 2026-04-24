import React, { useState, useRef, useEffect } from "react";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";
import * as fieldFormatters from "../../utils/fieldFormatters";
import { formatDateDDMMYYYY, parseDateDDMMYYYY } from "../../utils/utils";
import config from '@shared/config.general.js'

/**
 * Evalúa una expresión de derivedFields con el valor del campo.
 * La variable disponible en la expresión es `email` (valor del campo).
 */
function evalDerivedField(expr, fieldValue) {
  try {
    // eslint-disable-next-line no-new-func
    return new Function("email", `"use strict"; return (${expr});`)(fieldValue) ?? "";
  } catch {
    return "";
  } 
}

import { buildTransactionJson } from "../../utils/buildTransactionJson.js";
import { AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import MobileReview from "./MobileReview";
import PhoneInputField from "./PhoneInputField";
import MaskedInputField from "./MaskedInputField";
import DateInputField from "./DateInputField";

function WizardForm({ formConfig, pdfConfig, appConfig, brandConfig, company, form, docsPath }) {
  const [formData, setFormData] = useState(() => {
    const initialData = {};
    formConfig.steps.forEach((step) => {
      step.fields.forEach((field) => {
        if (field.default !== undefined) {
          initialData[field.name] =
            field.default === "today" && field.type === "date"
              ? formatDateDDMMYYYY(new Date().toISOString().split("T")[0])
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
  const [modalLoading, setModalLoading] = useState(false);
  const [signingUrl, setSigningUrl] = useState("");
  const [modalError, setModalError] = useState(null);
  const [applicationId, setApplicationId] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [loadIdInput, setLoadIdInput] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [saveConfirmPending, setSaveConfirmPending] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );
  const fileInputRef = useRef(null);
  const currentStep = formConfig.steps[stepIndex];

  /* ============================================================
     HANDLE CHANGE
  ============================================================ */
  const handleChange = (name, value, field = null) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (field?.exclusiveGroup && value === true) {
        formConfig.steps.forEach((step) =>
          step.fields.forEach((f) => {
            if (f.exclusiveGroup === field.exclusiveGroup && f.name !== name)
              updated[f.name] = false;
          })
        );
      }
      return updated;
    });
  };

  const handleChangeWithFormatter = (field, rawValue) => {
    let value = rawValue;
    if (field.formatter && fieldFormatters[field.formatter]) {
      value = fieldFormatters[field.formatter](rawValue);
    }
    setFormData((prev) => {
      let updated = { ...prev, [field.name]: value };
      if (field.syncTo) {
        updated[field.syncTo] = value;
      }
      if (field.derivedFields) {
        field.derivedFields.forEach(({ name, value: expr }) => {
          updated[name] = evalDerivedField(expr, value);
        });
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
        // Normalizar fechas a DD-MM-YYYY (compatible con datos viejos en YYYY-MM-DD)
        if (field.type === "date" && normalizedData[field.name]) {
          normalizedData[field.name] = parseDateDDMMYYYY(normalizedData[field.name]);
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
        if (field.syncTo) {
          // 🔹 Sincroniza el valor con otro campo
          mappedData[field.syncTo] = mappedData[field.name];
        } else if (field.derivedFields) {
          // 🔹 Calcula campos derivados a partir del valor del campo
          field.derivedFields.forEach(({ name, value: expr }) => {
            mappedData[name] = evalDerivedField(expr, mappedData[field.name]);
          });
        } else if (field.optionFields) {
          // 🔹 Aplica optionFields: setea los campos del índice seleccionado
          const selectedIndex = field.options?.indexOf(mappedData[field.name]) ?? -1;
          field.optionFields.forEach(opt => {
            Object.keys(opt).forEach(key => { mappedData[key] = ""; });   // limpia todas las keys posibles
          });
          if (selectedIndex >= 0 && field.optionFields[selectedIndex]) {
            Object.assign(mappedData, field.optionFields[selectedIndex]); // setea solo la seleccionada
          }
        } else if (field.type === "checkbox") {
          // 🔹 Exportar checkbox como "/" o ""
          mappedData[field.name] = mappedData[field.name] ? "/" : "";
        }
      });
    });

    return mappedData;
  };

const handleExport = () => {
  console.log("▶️ handleExport iniciado");

  try {
    const mappedData = getMappedFormData();
    console.log("🧩 getMappedFormData output:", mappedData);

    if (!mappedData) {
      throw new Error("getMappedFormData devolvió null/undefined");
    }

    const dataStr = JSON.stringify(mappedData, null, 2);
    console.log("📦 JSON generado:", dataStr);

    const blob = new Blob([dataStr], { type: "application/json" });
    console.log("📄 Blob creado:", blob);

    const url = URL.createObjectURL(blob);
    console.log("🔗 URL generada:", url);

    const filename = `${brandConfig.downloadFilename?.toLowerCase()}.json`;
    console.log("📁 Filename:", filename);

    if (!filename || filename === "undefined.json") {
      throw new Error("brandConfig.downloadFilename es inválido");
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    console.log("🖱️ Disparando descarga...");
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log("♻️ URL revocada");
    }, 1000);

    console.log("✅ Export finalizado correctamente");
  } catch (err) {
    console.error("❌ Error exportando JSON:", err);
    alert(`No se pudo exportar el JSON: ${err.message}`);
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
            ? formatDateDDMMYYYY(new Date().toISOString().split("T")[0])
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

    if (field.mask) {
      return (
        <div className="mb-2" key={field.name}>
          <label className="block text-brand-secondary mb-1">{field.label}</label>
          <MaskedInputField
            value={isEnabled ? value : ""}
            onChange={(val) => handleChange(field.name, val)}
            mask={field.mask}
            disabled={field.disabled || !isEnabled}
            placeholder={field.placeholder}
            className={`w-full p-3 border rounded focus:outline-none focus:ring-2 ${
              field.disabled || !isEnabled
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white border-gray-300 focus:ring-gray-300"
            }`}
            invalidClassName="!border-red-400 focus:ring-red-200"
          />
        </div>
      );
    }

    switch (field.type) {
      case "date":
        return (
          <div className="mb-2" key={field.name}>
            <label className="block text-brand-secondary mb-1">{field.label}</label>
            <DateInputField
              value={isEnabled ? value : ""}
              onChange={(val) => handleChange(field.name, val)}
              disabled={field.disabled || !isEnabled}
              inputClassName={`w-full p-3 border rounded focus:outline-none focus:ring-2 ${
                field.disabled || !isEnabled
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white border-gray-300 focus:ring-gray-300"
              }`}
              invalidClassName="!border-red-400 focus:ring-red-200"
            />
          </div>
        );

      case "tel":
        return (
          <div className="mb-2" key={field.name}>
            <label className="block text-brand-secondary mb-1">
              {field.label}
            </label>
            <div className={`w-full border rounded focus-within:ring-2 focus-within:ring-gray-300 ${
              field.disabled || !isEnabled
                ? "bg-gray-100 border-gray-200"
                : "bg-white border-gray-300"
            }`}>
              <PhoneInputField
                value={isEnabled ? value : ""}
                onChange={(val) => handleChange(field.name, val)}
                disabled={field.disabled || !isEnabled}
                placeholder={field.placeholder}
                inputClassName="py-3 pr-3 text-sm"
                selectClassName="pl-3 py-3"
              />
            </div>
          </div>
        );

      case "email":
      case "text":
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
        if (field.exclusiveGroup) {
          return (
            <div className="mb-1" key={field.name}>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name={field.exclusiveGroup}
                  checked={!!value}
                  onChange={() => handleChange(field.name, true, field)}
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary border-gray-300 cursor-pointer accent-brand-primary"
                />
                <span className="text-sm text-gray-700 group-hover:text-brand-primary transition-colors leading-snug">
                  {field.label}
                </span>
              </label>
            </div>
          );
        }
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
     APLICACIONES — GUARDAR / CARGAR
  ============================================================ */

  const updateUrl = (id) => {
    const url = new URL(window.location.href);
    url.searchParams.set("app", id);
    window.history.replaceState({}, "", url.toString());
  };

  const loadApplicationById = async (id) => {
    setLoadError(null);
    try {
      const resp = await fetch(
        `${config.backend.baseUrl}${config.backend.applicationsEndpoint}/${id}`
      );
      if (resp.status === 404) { setLoadError("ID no encontrado"); return; }
      if (!resp.ok) { setLoadError("Error al cargar la solicitud"); return; }
      const data = await resp.json();
      setFormData(data);
    } catch {
      setLoadError("No se pudo conectar al servidor");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get("app");
    if (appId && /^[a-f0-9]{32}$/.test(appId)) {
      setApplicationId(appId);
      loadApplicationById(appId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = () => {
    setFormData({});
    setApplicationId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("app");
    window.history.replaceState({}, "", url.toString());
  };

  const doSave = async (existingId) => {
    setSaveStatus("saving");
    setSaveConfirmPending(false);
    try {
      const baseUrl = `${config.backend.baseUrl}${config.backend.applicationsEndpoint}`;
      let id = existingId;
      if (id) {
        const resp = await fetch(`${baseUrl}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!resp.ok) throw new Error();
      } else {
        const resp = await fetch(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!resp.ok) throw new Error();
        const result = await resp.json();
        id = result.id;
        setApplicationId(id);
        updateUrl(id);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSave = () => {
    if (applicationId) {
      setSaveConfirmPending(true);
    } else {
      doSave(null);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    fetch(`${config.backend.baseUrl}${config.backend.deviceTypeEndpoint}`)
      .then(r => r.json())
      .then(d => setIsMobile(d.isMobile))
      .catch(() => {});
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        handleImport(JSON.parse(ev.target.result));
      } catch {
        alert("Archivo JSON inválido ❌");
      }
    };
    reader.readAsText(file);
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
      const pdfTemplate = pdfConfig.templatePdf;
      console.log("pdfTemplate:" + pdfTemplate);
      const pdfResp = await fetch(`/forms/${company}/${form}/${pdfTemplate}`);
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

const signUrl = `${config.backend.baseUrl}${config.backend.signEndpoint}`;

console.log("🌐 URL:", signUrl);
console.log("📦 transactionJson:", transactionJson);

// 👇 DEBUG de API KEY
console.log("🔑 VITE_ONESPAN_API_KEY (raw):", import.meta.env.VITE_ONESPAN_API_KEY);

if (!import.meta.env.VITE_ONESPAN_API_KEY) {
  console.warn("⚠️ API KEY no definida en import.meta.env");
}

  let signData;
try {
  const signResp = await fetch(signUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OneSpan-API-Key": import.meta.env.VITE_ONESPAN_API_KEY || "",
    },
    body: JSON.stringify(transactionJson),
  });

  console.log("📡 Response status:", signResp.status);
  console.log("📡 Response ok:", signResp.ok);

  const text = await signResp.text();
  console.log("📨 Raw response:", text);

  try {
    signData = JSON.parse(text);
  } catch (e) {
    console.error("❌ No es JSON válido");
  }

  if (!signResp.ok) {
    throw new Error(`Error backend (${signResp.status}): ${text}`);
  }

  console.log("✅ Parsed response:", signData);

} catch (err) {
  console.error("❌ Error en request:", err);
  alert(err.message);
}

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
    <>
      {isMobile ? (
        <MobileReview
          formData={formData}
          getMappedFormData={getMappedFormData}
          handleChange={handleChange}
          handleChangeWithFormatter={handleChangeWithFormatter}
          handleSign={handleSign}
          handleSave={handleSave}
          handleExport={handleExport}
          fileInputRef={fileInputRef}
          applicationId={applicationId}
          saveStatus={saveStatus}
          urlCopied={urlCopied}
          handleCopyUrl={handleCopyUrl}
          onClear={handleClear}
          formConfig={formConfig}
          brandConfig={brandConfig}
        />
      ) : (
      <>
      <h1 className="text-3xl font-bold text-center text-brand-primary mt-8 mb-8">
        {pdfConfig.title}
      </h1>
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
  className={`cursor-pointer px-4 py-1.5 mb-1 flex items-center transition border-l-4 border-transparent ${
    isActive
      ? "bg-brand-secondary text-blue-100 font-semibold border-brand-secondary"
      : "hover:bg-brand-secondary/50 text-blue-200"
  }`}
>
  {step.icon && (
    <CIcon icon={Icons[step.icon]} className="w-4 h-4 mr-2" />
  )}
  {step.title}
</li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">

        {/* Barra de acciones rápidas */}
        <div className="shrink-0 flex justify-end items-center gap-0.5 px-3 py-1.5 border-b border-gray-100">
          {[
            { icon: Icons.cilSave,         label: "Guardar en la nube",  action: handleSave },
            { icon: Icons.cilCloudDownload,label: "Descargar JSON",     action: handleExport },
            { icon: Icons.cilCloudUpload,  label: "Importar JSON",      action: () => fileInputRef.current.click() },
            { icon: Icons.cilTrash,       label: "Borrar formulario",  action: handleClear },
            { icon: Icons.cilPenNib,      label: "Firmar",             action: handleSign },
          ].map(({ icon, label, action }) => (
            <div key={label} className="group relative">
              <button
                type="button"
                onClick={action}
                className="p-1.5 rounded-lg text-brand-primary hover:bg-blue-50 transition-colors"
              >
                <CIcon icon={icon} className="w-5 h-5" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-30">
                {label}
              </div>
            </div>
          ))}
          {/* Docs link */}
          <div className="group relative ml-1 pl-1 border-l border-gray-200">
            <Link
              to={docsPath ?? `/${company}/${form}/docs`}
              className="p-1.5 rounded-lg text-brand-primary hover:bg-blue-50 transition-colors flex items-center"
            >
              <CIcon icon={Icons.cilNotes} className="w-5 h-5" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-30">
              Documentación API
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
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

              {/* Panel: Guardar / Cargar borrador */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-brand-secondary mb-3 flex items-center gap-2">
                  <CIcon icon={Icons.cilCloud} className="w-4 h-4" />
                  Guardar progreso
                </h3>

                {applicationId ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">ID de solicitud:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate text-xs font-mono bg-white border border-gray-200 px-2 py-1 rounded">
                        {applicationId}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="shrink-0 px-3 py-1 text-xs bg-brand-primary text-white rounded hover:bg-brand-secondary"
                      >
                        {urlCopied ? "¡Copiada!" : "Copiar URL"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saveStatus === "saving"}
                      className={`w-full py-2 text-sm rounded text-white disabled:opacity-50 ${
                        saveStatus === "saved"
                          ? "bg-green-600"
                          : saveStatus === "error"
                          ? "bg-red-600"
                          : "bg-brand-primary hover:bg-brand-secondary"
                      }`}
                    >
                      {saveStatus === "saving"
                        ? "Guardando..."
                        : saveStatus === "saved"
                        ? "Actualizado"
                        : saveStatus === "error"
                        ? "Error al guardar"
                        : "Actualizar datos guardados"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveStatus === "saving"}
                    className={`w-full py-2 text-sm rounded text-white disabled:opacity-50 ${
                      saveStatus === "saved"
                        ? "bg-green-600"
                        : saveStatus === "error"
                        ? "bg-red-600"
                        : "bg-brand-primary hover:bg-brand-secondary"
                    }`}
                  >
                    <CIcon icon={Icons.cilSave} className="w-4 h-4 inline mr-2" />
                    {saveStatus === "saving"
                      ? "Guardando..."
                      : saveStatus === "saved"
                      ? "Guardado"
                      : saveStatus === "error"
                      ? "Error al guardar"
                      : "Guardar en la nube"}
                  </button>
                )}

                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-gray-500 mb-2">Cargar solicitud guardada:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={loadIdInput}
                      onChange={(e) => setLoadIdInput(e.target.value)}
                      placeholder="Pegá el ID aquí..."
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const id = loadIdInput.trim();
                        if (!id) return;
                        setApplicationId(id);
                        updateUrl(id);
                        loadApplicationById(id);
                      }}
                      className="shrink-0 px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cargar
                    </button>
                  </div>
                  {loadError && (
                    <p className="text-xs text-red-500 mt-1">{loadError}</p>
                  )}
                </div>
              </div>

              {/* Botones acciones */}
              <div className="flex justify-between gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary"
                >
                  <CIcon icon={Icons.cilCloudDownload} className="w-5 h-5 mr-2" />
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

                <button
                  type="button"
                  onClick={handleClear}
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
                  <CIcon icon={Icons.cilPenNib} className="w-5 h-5 mr-2" />
                  Firmar
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
      </div>
      </>
      )}

      {/* Input oculto para importar JSON - siempre en el DOM */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept="application/json"
        className="hidden"
      />

      {/* Modal: confirmar sobrescribir o crear nuevo */}
      {saveConfirmPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-80 text-center shadow-lg">
            <h3 className="text-lg font-semibold text-brand-primary mb-2">¿Qué deseas hacer?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Ya existe un borrador guardado
              <br />
              <code className="text-xs font-mono text-gray-400">{applicationId.slice(0, 8)}…</code>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => doSave(applicationId)}
                className="flex-1 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-secondary"
              >
                Sobrescribir
              </button>
              <button
                type="button"
                onClick={() => doSave(null)}
                className="flex-1 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
              >
                Crear nuevo
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSaveConfirmPending(false)}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
    </>
  );
}

export default WizardForm;
