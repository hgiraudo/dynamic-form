import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";
import CompanySection from "./CompanySection";

function CompanyPage() {
  const { company: companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch("/forms/registry.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((registry) => {
        const found = registry.companies.find((c) => c.id === companyId);
        if (found) setCompany(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [companyId]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-300 mb-4">404</p>
          <p className="text-gray-500">Empresa no encontrada: {companyId}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-brand-primary hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-primary transition-colors mb-8"
        >
          <CIcon icon={Icons.cilArrowLeft} className="w-3.5 h-3.5" />
          Todos los formularios
        </Link>

        {!company && (
          <p className="text-center text-gray-400 text-sm">Cargando...</p>
        )}

        {company && <CompanySection company={company} />}
      </div>
    </div>
  );
}

export default CompanyPage;
