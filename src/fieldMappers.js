export const tipoDeTramiteMapper = (formData) => {
  console.log("[tipoDeTramiteMapper] formData recibido:", formData);
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

const fieldMappers = { tipoDeTramiteMapper };
export default fieldMappers;
