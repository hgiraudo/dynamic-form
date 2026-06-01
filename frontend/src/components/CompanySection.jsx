import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CIcon from "@coreui/icons-react";
import * as Icons from "@coreui/icons";

function CompanySection({ company, basePath }) {
  const [brand, setBrand] = useState(null);

  useEffect(() => {
    fetch(`/forms/${company.id}/brand.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setBrand(b))
      .catch(() => {});
  }, [company.id]);

  // Si la empresa tiene subdominio propio, construir la URL base apuntando a él.
  // En localhost no hay subdominio real, así que se usa la ruta normal.
  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const subdomainOrigin =
    company.subdomain && !isLocalhost
      ? `${window.location.protocol}//${company.subdomain}.${hostname.split(".").slice(-2).join(".")}`
      : null;

  // "Ver todos" apunta a la raíz del subdominio o a /:company
  const companyHref = subdomainOrigin ?? null;
  const companyTo = companyHref ? null : `/${company.id}`;

  // Cada formulario apunta a subdominio/form o a /company/form
  const formHref = (formId) =>
    subdomainOrigin ? `${subdomainOrigin}/${formId}` : null;
  const formTo = (formId) =>
    subdomainOrigin ? null : (basePath !== undefined ? basePath : `/${company.id}`) + `/${formId}`;

  return (
    <div className="mb-10">
      {/* Company header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        {brand?.logos?.color && (
          <img
            src={brand.logos.color}
            alt={brand?.name ?? company.name}
            className="h-8 object-contain"
          />
        )}
        {basePath === undefined && (
          companyHref ? (
            <a
              href={companyHref}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-brand-primary transition-colors ml-auto"
            >
              Ver todos
              <CIcon icon={Icons.cilArrowRight} className="w-3.5 h-3.5" />
            </a>
          ) : (
            <Link
              to={companyTo}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-brand-primary transition-colors ml-auto"
            >
              Ver todos
              <CIcon icon={Icons.cilArrowRight} className="w-3.5 h-3.5" />
            </Link>
          )
        )}
      </div>

      {/* Forms grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {company.forms.map((form) => {
          const href = formHref(form.id);
          const to = formTo(form.id);
          const inner = (
            <>
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 group-hover:bg-brand-primary transition-colors shrink-0">
                <CIcon
                  icon={Icons.cilDescription}
                  className="w-4 h-4 text-brand-primary group-hover:text-white transition-colors"
                />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 group-hover:text-brand-primary transition-colors truncate">
                  {form.title}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {company.id}/{form.id}
                </p>
              </div>
              <CIcon
                icon={Icons.cilArrowRight}
                className="w-4 h-4 text-gray-300 group-hover:text-brand-primary transition-colors ml-auto shrink-0"
              />
            </>
          );
          const cls = "group flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-brand-primary hover:shadow-md transition-all";
          return href ? (
            <a key={form.id} href={href} className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={form.id} to={to} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default CompanySection;
