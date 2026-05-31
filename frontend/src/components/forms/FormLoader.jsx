import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import WizardForm from "./WizardForm";

function FormLoader({ companyOverride }) {
  const params = useParams();
  const company = companyOverride ?? params.company;
  const { form } = params;
  const [configs, setConfigs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const formBase = `/forms/${company}/${form}`;
    const companyBase = `/forms/${company}`;

    Promise.all([
      fetch(`${formBase}/formConfig.json`).then(r => r.ok ? r.json() : Promise.reject(`formConfig`)),
      fetch(`${companyBase}/brand.json`).then(r => r.ok ? r.json() : Promise.reject(`brand`)),
      fetch(`${formBase}/transactionConfig.json`).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([formConfig, brandConfig, transactionConfig]) => {
        setConfigs({ formConfig, brandConfig, transactionConfig });

        document.title = `${brandConfig.name} — ${formConfig.title}`;

        const primary = brandConfig.colors?.primary ?? '#0A2D5E';
        const secondary = brandConfig.colors?.secondary ?? '#154284';
        document.documentElement.style.setProperty('--color-brand-primary', primary);
        document.documentElement.style.setProperty('--color-brand-secondary', secondary);

        if (brandConfig.favicon) {
          document.querySelectorAll("link[rel~='icon']").forEach(l => l.remove());
          const link = document.createElement("link");
          link.rel = "icon";
          link.href = `${brandConfig.favicon}?v=${Date.now()}`;
          document.head.appendChild(link);
        }
      })
      .catch((missing) => setError(`Formulario no encontrado (${missing})`));
  }, [company, form]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-300 mb-4">404</p>
          <p className="text-gray-500">{error}</p>
          <p className="text-sm text-gray-400 mt-2">{company}/{form}</p>
        </div>
      </div>
    );
  }

  if (!configs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Cargando formulario...</div>
      </div>
    );
  }

  const docsPath = companyOverride ? `/${form}/docs` : `/${company}/${form}/docs`;

  return (
    <WizardForm
      formConfig={configs.formConfig}
      brandConfig={configs.brandConfig}
      transactionConfig={configs.transactionConfig}
      company={company}
      form={form}
      docsPath={docsPath}
    />
  );
}

export default FormLoader;
