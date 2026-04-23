import React, { useState, useEffect } from "react";
import CompanySection from "./CompanySection";

function HomePage() {
  const [registry, setRegistry] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/forms/registry.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRegistry)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-brand-primary mb-2">
            Formularios disponibles
          </h1>
          <p className="text-gray-500 text-sm">
            Seleccioná el formulario que querés completar
          </p>
        </div>

        {error && (
          <p className="text-center text-gray-400 text-sm">
            No se pudo cargar el registro de formularios
          </p>
        )}
        {!registry && !error && (
          <p className="text-center text-gray-400 text-sm">Cargando...</p>
        )}
        {registry?.companies?.length === 0 && (
          <p className="text-center text-gray-400 text-sm">
            No hay formularios disponibles
          </p>
        )}

        {registry?.companies?.map((company) => (
          <CompanySection key={company.id} company={company} />
        ))}
      </div>
    </div>
  );
}

export default HomePage;
