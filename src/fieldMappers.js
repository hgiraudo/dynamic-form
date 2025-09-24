// Mapper para el tipo de trámite
export const tipoDeTramiteMapper = (formData) => {
  const result = {
    TipoDeTramiteApertura: "",
    TipoDeTramiteActualizacion: "",
    TipoDeTramiteIncorporacion: "",
  };
  switch (formData.TipoDeTramite) {
    case "Apertura":
      result.TipoDeTramiteApertura = "/";
      break;
    case "Actualización":
      result.TipoDeTramiteActualizacion = "/";
      break;
    case "Incorporación":
      result.TipoDeTramiteIncorporacion = "/";
      break;
  }
  return { ...formData, ...result };
};

// Mapper para el tipo de firma
export const usoDeFirmaMapper = (formData) => {
  const result = {
    UsoDeFirmaIndistinta: "",
    UsoDeFirmaConjunta: "",
  };
  switch (formData.TipoFirma) {
    case "Indistinta":
      result.UsoDeFirmaIndistinta = "/";
      break;
    case "Conjunta":
      result.UsoDeFirmaConjunta = "/";
      break;
  }
  return { ...formData, ...result };
};

export const fechaTramiteMapper = (formData) => {
  const mapped = { ...formData };
  if (formData.TramiteFecha) {
    const [yyyy, mm, dd] = formData.TramiteFecha.split("-");
    mapped.TramiteFecha = `${dd}-${mm}-${yyyy}`;
  }
  return mapped;
};

// Función utilitaria para formatear fechas en dd-mm-yyyy
export const formatDateDDMMYYYY = (date) => {
  if (!(date instanceof Date)) return ""; // protección
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};
