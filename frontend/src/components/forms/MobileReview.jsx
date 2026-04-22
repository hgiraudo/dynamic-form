import React, { useState } from "react";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";
import formConfig from "../../config/formConfig.json";
import { brandConfig } from "../../branding/brandConfig";
function MobileReview({
  formData,
  getMappedFormData,
  handleChange,
  handleChangeWithFormatter,
  handleSign,
  handleSave,
  handleExport,
  fileInputRef,
  applicationId,
  saveStatus,
  urlCopied,
  handleCopyUrl,
  setFormData,
}) {
  const [openStep, setOpenStep] = useState(0);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(window.location.href)}`;

  const quickActions = [
    { icon: Icons.cilSave,     label: "Guardar en la nube",  action: handleSave,            href: null },
    { icon: Icons.cilTrash,    label: "Borrar formulario",   action: () => setFormData({}), href: null },
    { icon: Icons.cilPenNib,   label: "Firmar",              action: handleSign,            href: null },
    { icon: Icons.cilLink,     label: urlCopied ? "¡Copiada!" : "Copiar URL", action: handleCopyUrl, href: null },
    { icon: Icons.cibWhatsapp, label: "Enviar por WhatsApp", action: null, href: whatsappUrl,
      iconClass: "w-5 h-5 brightness-0 invert", wrapperClass: "ml-3 pl-3 border-l border-white/30" },
  ];

  const isFieldVisible = (field) => {
    if (!field.visibleIf) return true;
    const { field: depField, value: depVal } = field.visibleIf;
    const depValue = formData[depField];
    return depVal === "" ? !!depValue : depValue === depVal;
  };

  const isFieldEnabled = (field) => {
    if (!field.enabledIf) return true;
    const { field: depField, value: depVal } = field.enabledIf;
    const depValue = formData[depField];
    return depVal === "" ? !!depValue : depValue === depVal;
  };

  const renderField = (field, fIdx) => {
    if (!isFieldVisible(field)) return null;

    if (field.type === "group") {
      return (
        <div key={fIdx} className="pt-4 pb-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            {field.label}
          </span>
        </div>
      );
    }

    if (!field.name || ["info", "comment", "subtitle"].includes(field.type)) return null;

    const enabled = isFieldEnabled(field) && !field.disabled;
    const value = formData[field.name] ?? (field.type === "checkbox" ? false : "");

    const baseClass = "border-b border-gray-100 last:border-0";

    if (field.type === "checkbox") {
      return (
        <div key={fIdx} className={`flex items-center justify-between py-3 ${baseClass}`}>
          <span className="text-sm text-gray-600">{field.label}</span>
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => handleChange(field.name, e.target.checked)}
            disabled={!enabled}
            className="h-5 w-5 rounded border-gray-300 text-brand-primary"
          />
        </div>
      );
    }

    if (field.type === "button-group") {
      return (
        <div key={fIdx} className={`py-3 ${baseClass}`}>
          <span className="block text-xs text-gray-400 mb-1.5">{field.label}</span>
          <div className="flex flex-wrap gap-1.5">
            {field.options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleChange(field.name, opt)}
                disabled={!enabled}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  (value || field.options[0]) === opt
                    ? "bg-brand-primary text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={fIdx} className={`py-2 ${baseClass}`}>
          <label className="block text-xs text-gray-400 mb-0.5">{field.label}</label>
          <textarea
            value={value}
            onChange={e => handleChange(field.name, e.target.value)}
            disabled={!enabled}
            rows={2}
            className="w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-transparent focus:border-brand-primary focus:outline-none py-0.5 transition-colors resize-none disabled:text-gray-400"
          />
        </div>
      );
    }

    // text, email, tel, date
    return (
      <div key={fIdx} className={`py-2 ${baseClass}`}>
        <label className="block text-xs text-gray-400 mb-0.5">{field.label}</label>
        <input
          type={field.type}
          value={enabled ? value : ""}
          placeholder={field.placeholder || ""}
          onChange={e => handleChangeWithFormatter(field, e.target.value)}
          disabled={!enabled}
          className="w-full text-sm text-gray-900 font-medium bg-transparent border-0 border-b-2 border-transparent focus:border-brand-primary focus:outline-none py-0.5 transition-colors disabled:text-gray-400"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-brand-primary px-4 py-3 flex items-center justify-between shadow-md">
        <img src={brandConfig.logos.white} alt={brandConfig.name} className="h-8" />
        <div className="flex items-center">
          {quickActions.map(({ icon, label, action, href, iconClass, wrapperClass }) => {
            const cls = "p-2 rounded-lg text-white/75 hover:text-white hover:bg-white/15 active:bg-white/25 transition-colors";
            const ic = <CIcon icon={icon} className={iconClass ?? "w-5 h-5"} />;
            const tooltip = (
              <div className="absolute top-full right-0 mt-1.5 px-2 py-1 text-xs bg-gray-900 text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30 shadow">
                {label}
              </div>
            );
            return (
              <div key={label} className={`group relative ${wrapperClass ?? ""}`}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{ic}</a>
                ) : (
                  <button type="button" onClick={action} className={cls}>{ic}</button>
                )}
                {tooltip}
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Título + compartir */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-brand-primary">Revisión de datos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Verificá y editá los datos antes de firmar</p>
      </div>

      {/* Acordeón editable */}
      <div className="mx-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {formConfig.steps.slice(0, -1).map((step, idx) => {
          const isOpen = openStep === idx;
          const editableFields = step.fields.filter(
            f => !f.hideOnRevision &&
                 !["info", "comment", "subtitle"].includes(f.type)
          );

          return (
            <div key={idx} className={idx > 0 ? "border-t border-gray-100" : ""}>

              {/* Cabecera */}
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

              {/* Campos editables */}
              {isOpen && (
                <div className="px-4 pb-2 border-t border-gray-100">
                  {editableFields.map((field, fIdx) => renderField(field, fIdx))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botón Firmar fijo */}
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
