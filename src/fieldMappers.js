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

export const sujetoObligadoMapper = (formData) => {
  const mapped = { ...formData };
  if ("SujetoObligado" in formData) {
    mapped.SujetoObligado = formData.SujetoObligado ? "/" : "";
  }
  return mapped;
};

export const fechaTramiteMapper = (formData) => {
  const mapped = { ...formData };
  if (formData.TramiteFecha) {
    const [yyyy, mm, dd] = formData.TramiteFecha.split("-");
    mapped.TramiteFecha = `${dd}-${mm}-${yyyy}`;
  }
  return mapped;
};

export const representanteApellido1Mapper = (formData) => {
  const mapped = { ...formData };
  if (formData.RepresentanteApellido1) {
    mapped.Firmante1Apellido = formData.RepresentanteApellido1;
  }
  return mapped;
};

// 📨 Mapper genérico para correos electrónicos
export const emailMapper = (formData, fieldName) => {
  const newData = { ...formData };

  const index = fieldName.replace("CorreoElectronico", ""); // 1,2,3,...
  const value = formData[fieldName];

  if (value && value.includes("@")) {
    const [usuario, dominio] = value.split("@");
    newData[`CorreoElectronicoUsuario${index}`] = usuario;
    newData[`CorreoElectronicoDominio${index}`] = dominio;
  }

  // opcional: eliminamos el campo original
  // delete newData[fieldName];

  return newData;
};
