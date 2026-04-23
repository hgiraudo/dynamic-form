import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import WizardForm from "./WizardForm";

function FormLoader() {
  const { company, form } = useParams();
  const [configs, setConfigs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const formBase = `/forms/${company}/${form}`;
    const companyBase = `/forms/${company}`;

    Promise.all([
      fetch(`${formBase}/formConfig.json`).then(r => r.ok ? r.json() : Promise.reject(`formConfig`)),
      fetch(`${formBase}/pdfConfig.json`).then(r => r.ok ? r.json() : Promise.reject(`pdfConfig`)),
      fetch(`${formBase}/appConfig.json`).then(r => r.ok ? r.json() : Promise.reject(`appConfig`)),
      fetch(`${companyBase}/brand.json`).then(r => r.ok ? r.json() : Promise.reject(`brand`)),
    ])
      .then(([formConfig, pdfConfig, appConfig, brandConfig]) => {
        setConfigs({ formConfig, pdfConfig, appConfig, brandConfig });

        // Título de pestaña
        document.title = `${brandConfig.name} — ${pdfConfig.title}`;

        // Favicon dinámico
        if (brandConfig.favicon) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = brandConfig.favicon;
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

  return (
    <WizardForm
      formConfig={configs.formConfig}
      pdfConfig={configs.pdfConfig}
      appConfig={configs.appConfig}
      brandConfig={configs.brandConfig}
      company={company}
      form={form}
    />
  );
}

export default FormLoader;
