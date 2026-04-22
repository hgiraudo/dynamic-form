import React, { useState } from "react";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";
import formConfig from "../../config/formConfig.json";
import { brandConfig } from "../../branding/brandConfig";

function MobileReview({
  formData,
  getMappedFormData,
  handleSign,
  handleSave,
  handleExport,
  fileInputRef,
  applicationId,
  saveStatus,
  urlCopied,
  handleCopyUrl,
  loadIdInput,
  setLoadIdInput,
  loadError,
  loadApplicationById,
  updateUrl,
  setApplicationId,
  setFormData,
}) {
  const [openStep, setOpenStep] = useState(0);
  const mappedData = getMappedFormData();

  const quickActions = [
    { icon: Icons.cilSave,          label: "Guardar en la nube", action: handleSave },
    { icon: Icons.cilCloudDownload, label: "Descargar JSON",     action: handleExport },
    { icon: Icons.cilCloudUpload,   label: "Importar JSON",      action: () => fileInputRef.current?.click() },
    { icon: Icons.cilTrash,       label: "Borrar formulario",  action: () => setFormData({}) },
    { icon: Icons.cilPenNib,      label: "Firmar",             action: handleSign },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-brand-primary px-4 py-3 flex items-center justify-between shadow-md">
        <img src={brandConfig.logos.white} alt={brandConfig.name} className="h-8" />
        <div className="flex items-center">
          {quickActions.map(({ icon, label, action }) => (
            <div key={label} className="group relative">
              <button
                type="button"
                onClick={action}
                className="p-2 rounded-lg text-white/75 hover:text-white hover:bg-white/15 active:bg-white/25 transition-colors"
              >
                <CIcon icon={icon} className="w-5 h-5" />
              </button>
              <div className="absolute top-full right-0 mt-1.5 px-2 py-1 text-xs bg-gray-900 text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30 shadow">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* App ID bar */}
      {applicationId && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CIcon icon={Icons.cilCloud} className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <code className="text-xs text-blue-700 truncate">{applicationId}</code>
          </div>
          <button onClick={handleCopyUrl} className="shrink-0 text-xs font-semibold text-blue-600">
            {urlCopied ? "¡Copiada!" : "Copiar URL"}
          </button>
        </div>
      )}

      {/* Status toasts */}
      {saveStatus === "saved" && (
        <div className="mx-4 mt-3 px-3 py-2.5 bg-green-100 border border-green-200 rounded-xl text-sm text-green-700 text-center">
          Guardado correctamente
        </div>
      )}
      {saveStatus === "error" && (
        <div className="mx-4 mt-3 px-3 py-2.5 bg-red-100 border border-red-200 rounded-xl text-sm text-red-700 text-center">
          Error al guardar
        </div>
      )}

      {/* Page title */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-brand-primary">Revisión de datos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Verificá la información antes de firmar</p>
      </div>

      {/* Accordion de pasos */}
      <div className="mx-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {formConfig.steps.slice(0, -1).map((step, idx) => {
          const isOpen = openStep === idx;
          const visibleFields = step.fields.filter(
            f => !f.hideOnRevision &&
                 f.type !== "info" &&
                 f.type !== "comment" &&
                 f.type !== "subtitle"
          );

          return (
            <div key={idx} className={idx > 0 ? "border-t border-gray-100" : ""}>

              {/* Cabecera del paso */}
              <button
                type="button"
                onClick={() => setOpenStep(isOpen ? null : idx)}
                className={`w-full flex items-center justify-between px-4 py-4 text-left transition-colors ${
                  isOpen ? "bg-blue-50" : "hover:bg-gray-50 active:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  {step.icon && (
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-colors ${
                      isOpen ? "bg-brand-primary" : "bg-gray-100"
                    }`}>
                      <CIcon
                        icon={Icons[step.icon]}
                        className={`w-4 h-4 ${isOpen ? "text-white" : "text-gray-400"}`}
                      />
                    </span>
                  )}
                  <span className={`text-sm font-semibold ${isOpen ? "text-brand-primary" : "text-gray-700"}`}>
                    {step.title}
                  </span>
                </div>
                <CIcon
                  icon={isOpen ? Icons.cilChevronTop : Icons.cilChevronBottom}
                  className={`w-4 h-4 shrink-0 ${isOpen ? "text-brand-primary" : "text-gray-300"}`}
                />
              </button>

              {/* Contenido del paso */}
              {isOpen && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  {visibleFields.map((field, fIdx) => {
                    if (field.type === "group") {
                      return (
                        <div key={fIdx} className="pt-4 pb-1">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            {field.label}
                          </span>
                        </div>
                      );
                    }
                    if (!field.name) return null;

                    let value = mappedData[field.name] ?? "";
                    if (field.type === "checkbox") value = formData[field.name] ? "Sí" : "No";
                    if (!value && value !== false) return null;

                    return (
                      <div
                        key={fIdx}
                        className="flex justify-between items-baseline py-2.5 border-b border-gray-100 last:border-0 gap-4"
                      >
                        <span className="text-xs text-gray-500 shrink-0">{field.label}</span>
                        <span className="text-sm text-gray-900 font-medium text-right break-words max-w-[60%]">
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cargar por ID */}
      <div className="mx-4 mt-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Cargar solicitud guardada
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={loadIdInput}
            onChange={e => setLoadIdInput(e.target.value)}
            placeholder="Pegá el ID aquí..."
            className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
            className="px-4 py-2.5 text-sm bg-brand-primary text-white rounded-xl font-semibold active:bg-brand-secondary"
          >
            Cargar
          </button>
        </div>
        {loadError && <p className="text-xs text-red-500 mt-2">{loadError}</p>}
      </div>

      {/* Botón Firmar fijo en el fondo */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-4 shadow-xl">
        <button
          type="button"
          onClick={handleSign}
          className="w-full flex items-center justify-center gap-3 py-4 bg-green-600 text-white rounded-2xl font-bold text-lg shadow-lg active:bg-green-700 transition-colors"
        >
          <CIcon icon={Icons.cilPenNib} className="w-6 h-6" />
          Firmar
        </button>
      </div>
    </div>
  );
}

export default MobileReview;
