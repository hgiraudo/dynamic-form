import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";
import config from "@shared/config.general.js";

/* ── helpers ─────────────────────────────────────────────────────── */

function fieldType(field) {
  if (field.type === "checkbox") return { label: "boolean", color: "purple" };
  if (field.type === "date")     return { label: "string · date", color: "green" };
  if (field.type === "email")    return { label: "string · email", color: "cyan" };
  if (field.type === "tel")      return { label: "string · tel", color: "blue" };
  if (field.type === "button-group") return { label: "string · enum", color: "orange" };
  if (field.type === "textarea") return { label: "string", color: "blue" };
  return { label: "string", color: "blue" };
}

function fieldExample(field) {
  if (field.type === "checkbox")    return false;
  if (field.type === "date")        return "2024-01-15";
  if (field.type === "button-group" && field.options?.length) return field.options[0];
  if (field.placeholder)            return field.placeholder;
  return "";
}

function buildExampleBody(formConfig) {
  const obj = {};
  formConfig.steps.forEach((step) => {
    step.fields.forEach((field) => {
      if (!field.name || ["info", "comment", "subtitle", "group"].includes(field.type)) return;
      obj[field.name] = fieldExample(field);
    });
  });
  return obj;
}

const TYPE_COLORS = {
  blue:   "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  green:  "bg-green-100 text-green-700",
  cyan:   "bg-cyan-100 text-cyan-700",
  orange: "bg-orange-100 text-orange-700",
};

/* ── sub-components ──────────────────────────────────────────────── */

function CopyButton({ text, label = "Copiar" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
    >
      <CIcon icon={copied ? Icons.cilCheckCircle : Icons.cilCopy} className="w-3.5 h-3.5" />
      {copied ? "¡Copiado!" : label}
    </button>
  );
}

function StepSection({ step, stepIndex }) {
  const fields = step.fields.filter(
    (f) => f.name && !["info", "comment", "subtitle", "group"].includes(f.type)
  );
  if (!fields.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold shrink-0">
          {stepIndex + 1}
        </span>
        <h3 className="text-sm font-semibold text-gray-700">{step.title}</h3>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Campo</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Tipo</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Ejemplo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fields.map((field) => {
              const t = fieldType(field);
              return (
                <tr key={field.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                      {field.name}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[t.color]}`}>
                      {t.label}
                    </span>
                    {field.type === "button-group" && field.options && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {field.options.map((o) => (
                          <span key={o} className="text-xs text-gray-400 font-mono">
                            "{o}"
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{field.label}</td>
                  <td className="px-4 py-3">
                    {fieldExample(field) !== "" && fieldExample(field) !== false ? (
                      <span className="text-xs font-mono text-gray-400 truncate block max-w-[160px]">
                        {String(fieldExample(field))}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────────── */

function DocsPage({ companyOverride }) {
  const params = useParams();
  const company = companyOverride ?? params.company;
  const { form } = params;
  const [configs, setConfigs] = useState(null);
  const [error, setError] = useState(null);

  const endpoint = `${config.backend.prefillEndpoint}/${company}/${form}`;
  const formPath  = companyOverride ? `/${form}` : `/${company}/${form}`;

  useEffect(() => {
    const formBase    = `/forms/${company}/${form}`;
    const companyBase = `/forms/${company}`;
    Promise.all([
      fetch(`${formBase}/formConfig.json`).then((r) => r.ok ? r.json() : Promise.reject()),
      fetch(`${formBase}/pdfConfig.json`).then((r)  => r.ok ? r.json() : Promise.reject()),
      fetch(`${companyBase}/brand.json`).then((r)   => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([formConfig, pdfConfig, brand]) => setConfigs({ formConfig, pdfConfig, brand }))
      .catch(() => setError("Formulario no encontrado"));
  }, [company, form]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">{error}</p>
    </div>
  );

  if (!configs) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  );

  const { formConfig, pdfConfig, brand } = configs;
  const exampleBody   = buildExampleBody(formConfig);
  const exampleJson   = JSON.stringify(exampleBody, null, 2);
  const fullEndpoint  = `${window.location.origin}${endpoint}`;
  const curlExample   = `curl -X POST "${fullEndpoint}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(exampleBody)}'`;
  const responseExample = JSON.stringify(
    { id: "a3f2c1d4e5b6a7f8c9d0e1f2a3b4c5d6", url: `${window.location.origin}${formPath}?app=a3f2c1d4e5b6a7f8c9d0e1f2a3b4c5d6` },
    null, 2
  );

  // Filtrar pasos que tengan al menos un campo documentable
  const documentableSteps = formConfig.steps.filter((step) =>
    step.fields.some((f) => f.name && !["info", "comment", "subtitle", "group"].includes(f.type))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to={formPath}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-primary transition-colors shrink-0"
          >
            <CIcon icon={Icons.cilArrowLeft} className="w-3.5 h-3.5" />
            Volver al formulario
          </Link>
          {brand?.logos?.color && (
            <img src={brand.logos.color} alt={brand.name} className="h-7 object-contain ml-4" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-brand-primary mb-1">{pdfConfig.title}</h1>
        <p className="text-gray-500 text-sm mb-8">Documentación de la API de pre-completado</p>

        {/* Endpoint card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-bold tracking-wide">
              POST
            </span>
            <code className="text-sm font-mono text-gray-800 break-all">{endpoint}</code>
          </div>
          <p className="text-sm text-gray-500">
            Crea un borrador pre-completado con los datos enviados y devuelve la URL del formulario listo para abrir.
          </p>
        </div>

        {/* Parameters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <CIcon icon={Icons.cilList} className="w-4 h-4 text-brand-primary" />
            Parámetros (Request Body · application/json)
          </h2>
          {documentableSteps.map((step, idx) => (
            <StepSection key={idx} step={step} stepIndex={idx} />
          ))}
        </div>

        {/* Example request */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <CIcon icon={Icons.cilCode} className="w-4 h-4 text-brand-primary" />
              Ejemplo de solicitud
            </h2>
            <div className="flex gap-2">
              <CopyButton text={exampleJson} label="Copiar JSON" />
              <CopyButton text={curlExample} label="Copiar curl" />
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">JSON body</p>
            <pre className="bg-gray-950 text-green-300 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed">
              {exampleJson}
            </pre>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">curl</p>
            <pre className="bg-gray-950 text-green-300 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
              {curlExample}
            </pre>
          </div>
        </div>

        {/* Response */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CIcon icon={Icons.cilCheckCircle} className="w-4 h-4 text-green-600" />
            Respuesta exitosa · <span className="text-green-600">200 OK</span>
          </h2>
          <pre className="bg-gray-950 text-green-300 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed">
            {responseExample}
          </pre>
          <p className="text-xs text-gray-400 mt-3">
            <strong className="text-gray-600">url</strong> — enlace directo al formulario con los datos pre-cargados. Compartilo con el usuario para que lo abra.
          </p>
        </div>

      </div>
    </div>
  );
}

export default DocsPage;
