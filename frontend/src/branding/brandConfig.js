/**
 * Configuración de marca corporativa
 *
 * Este archivo centraliza todos los elementos de branding:
 * - Colores corporativos
 * - Fuentes y tipografía
 * - Rutas de logos
 *
 * Para cambiar la marca, edite únicamente este archivo.
 */

export const brandConfig = {
  // Nombre de la empresa
  name: "Allaria",

  // Colores corporativos
  colors: {
    primary: "#0A2D5E",        // Azul principal (allaria-blue)
    secondary: "#154284",      // Azul claro secundario (allaria-light-blue)
    primaryText: "#0A2D5E",    // Color de texto principal
    secondaryText: "#154284",  // Color de texto secundario
  },

  // Logos
  logos: {
    white: "/img/allaria-logo-blanco.svg",  // Logo para fondos oscuros
    color: "/img/allaria-logo-color.svg",   // Logo para fondos claros
  },

  // Tipografía (opcional - actualmente usa las fuentes del sistema)
  fonts: {
    // Puedes agregar fuentes personalizadas aquí si es necesario
    // primary: "'Roboto', sans-serif",
    // secondary: "'Open Sans', sans-serif",
  },
};

export default brandConfig;
