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

export const representanteNombre1Mapper = (formData) => {
  const mapped = { ...formData };
  if (formData.RepresentanteNombre1) {
    mapped.Firmante1Nombre = formData.RepresentanteNombre1;
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

export const representanteEmail1Mapper = (formData) => {
  const mapped = { ...formData };
  if (formData.RepresentanteEmail1) {
    mapped.Firmante1Email = formData.RepresentanteEmail1;
  }
  return mapped;
};

export const representanteApellido2Mapper = (formData) => {
  const mapped = { ...formData };
  if (formData.RepresentanteApellido2) {
    mapped.Firmante2Apellido = formData.RepresentanteApellido2;
  }
  return mapped;
};

export const representanteNombre2Mapper = (formData) => {
  const mapped = { ...formData };
  if (formData.RepresentanteNombre2) {
    mapped.Firmante2Nombre = formData.RepresentanteNombre2;
  }
  return mapped;
};

export const representanteEmail2Mapper = (formData) => {
  const mapped = { ...formData };
  if (formData.RepresentanteEmail2) {
    mapped.Firmante2Email = formData.RepresentanteEmail2;
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

  return newData;
};
