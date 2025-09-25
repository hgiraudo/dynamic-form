// src/utils/buildPdfJson.js
import { splitEmail, formatDate, boolToSlash } from "./utils";

/**
 * 🔹 Arma el JSON que el backend necesita para rellenar el PDF
 * Solo para frontend.
 */
export const buildPdfJson = (formData) => {
  const email1 = splitEmail(
    formData.CorreoElectronicoUsuario1 +
      "@" +
      formData.CorreoElectronicoDominio1
  );
  const email2 = splitEmail(
    formData.CorreoElectronicoUsuario2 +
      "@" +
      formData.CorreoElectronicoDominio2
  );
  const email3 = splitEmail(
    formData.CorreoElectronicoUsuario3 +
      "@" +
      formData.CorreoElectronicoDominio3
  );

  return {
    // Trámite
    TipoDeTramiteApertura: boolToSlash(formData.TipoDeTramiteApertura),
    TipoDeTramiteActualizacion: boolToSlash(
      formData.TipoDeTramiteActualizacion
    ),
    TipoDeTramiteIncorporacion: boolToSlash(
      formData.TipoDeTramiteIncorporacion
    ),
    TramiteFecha: formatDate(formData.TramiteFecha),
    SujetoObligado: boolToSlash(formData.SujetoObligado),
    UsoDeFirmaIndistinta: boolToSlash(formData.UsoDeFirmaIndistinta),
    UsoDeFirmaConjunta: boolToSlash(formData.UsoDeFirmaConjunta),
    NumeroDeComitente: formData.NumeroDeComitente,

    // Oficial de Cuenta
    Confecciono: formData.Confecciono,
    Oficial: formData.Oficial,
    Administrador: formData.Administrador,

    // Razón Social
    RazonSocial: formData.RazonSocial,
    FechaDeConstitucion: formatDate(formData.FechaDeConstitucion),
    FechaDeInscripcion: formatDate(formData.FechaDeInscripcion),
    CUIT: formData.CUIT,
    LugarDeInscripcion: formData.LugarDeInscripcion,
    NumeroDeInscripcion: formData.NumeroDeInscripcion,
    DomicilioAdministracion: formData.DomicilioAdministracion,
    DomicilioComercial: formData.DomicilioComercial,
    ActividadPrincipal: formData.ActividadPrincipal,
    Telefono: formData.Telefono,
    CorreoElectronicoUsuario1: email1.user,
    CorreoElectronicoDominio1: email1.domain,
    CorreoElectronicoUsuario2: email2.user,
    CorreoElectronicoDominio2: email2.domain,
    CorreoElectronicoUsuario3: email3.user,
    CorreoElectronicoDominio3: email3.domain,
    Accionistas: formData.Accionistas,
    BeneficiarioFinal: formData.BeneficiarioFinal,
    CondicionAnteIVA: formData.CondicionAnteIVA,
    CondicionAnteGanancias: formData.CondicionAnteGanancias,
    CondicionAnteIIBB: formData.CondicionAnteIIBB,

    // Representante 1
    RepresentanteNombre1: formData.RepresentanteNombre1,
    RepresentanteApellido1: formData.RepresentanteApellido1,
    RepresentanteDNI1: formData.RepresentanteDNI1,
    RepresentantePasaporte1: formData.RepresentantePasaporte1,
    RepresentanteNacionalidad1: formData.RepresentanteNacionalidad1,
    RepresentanteLugarDeNacimiento1: formData.RepresentanteLugarDeNacimiento1,
    RepresentanteFechaDeNacimiento1: formatDate(
      formData.RepresentanteFechaDeNacimiento1
    ),
    RepresentanteCUIT1: formData.RepresentanteCUIT1,
    RepresentanteTelefono1: formData.RepresentanteTelefono1,
    RepresentanteEmail1: formData.RepresentanteEmail1,
    RepresentanteDomicilio1: formData.RepresentanteDomicilio1,
    RepresentanteActividad1: formData.RepresentanteActividad1,
    RepresentanteEstadoCivil1: formData.RepresentanteEstadoCivil1,
    RepresentanteCargo1: formData.RepresentanteCargo1,
    RepresentanteVencimiento1: formatDate(formData.RepresentanteVencimiento1),
    RepresentanteNuevoVencimiento1: formatDate(
      formData.RepresentanteNuevoVencimiento1
    ),

    // Representante 2
    RepresentanteNombre2: formData.RepresentanteNombre2,
    RepresentanteApellido2: formData.RepresentanteApellido2,
    RepresentanteDNI2: formData.RepresentanteDNI2,
    RepresentantePasaporte2: formData.RepresentantePasaporte2,
    RepresentanteNacionalidad2: formData.RepresentanteNacionalidad2,
    RepresentanteLugarDeNacimiento2: formData.RepresentanteLugarDeNacimiento2,
    RepresentanteFechaDeNacimiento2: formatDate(
      formData.RepresentanteFechaDeNacimiento2
    ),
    RepresentanteCUIT2: formData.RepresentanteCUIT2,
    RepresentanteTelefono2: formData.RepresentanteTelefono2,
    RepresentanteEmail2: formData.RepresentanteEmail2,
    RepresentanteDomicilio2: formData.RepresentanteDomicilio2,
    RepresentanteActividad2: formData.RepresentanteActividad2,
    RepresentanteEstadoCivil2: formData.RepresentanteEstadoCivil2,
    RepresentanteCargo2: formData.RepresentanteCargo2,
    RepresentanteVencimiento2: formatDate(formData.RepresentanteVencimiento2),
    RepresentanteNuevoVencimiento2: formatDate(
      formData.RepresentanteNuevoVencimiento2
    ),
  };
};
