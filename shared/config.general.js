// Configuración centralizada de puertos
const FRONTEND_PORT = 8080;
const BACKEND_PORT = 4000;

// Función para detectar el entorno
const detectEnvironment = () => {
  // En Node.js (backend)
  if (typeof process !== 'undefined' && process.env) {
    return {
      isBrowser: false,
      host: process.env.HOST || '0.0.0.0',
      backendPort: parseInt(process.env.PORT) || BACKEND_PORT,
    };
  }

  // En el navegador (frontend)
  if (typeof window !== 'undefined') {
    return {
      isBrowser: true,
      host: 'localhost', // El navegador siempre usa localhost en desarrollo
      backendPort: BACKEND_PORT,
    };
  }

  // Fallback
  return {
    isBrowser: false,
    host: 'localhost',
    backendPort: BACKEND_PORT,
  };
};

// Función para obtener la URL del backend
const getBackendUrl = () => {
  const env = detectEnvironment();

  // En el navegador, si existe variable de entorno de Vite, usarla
  if (env.isBrowser && typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // En desarrollo local, el navegador usa localhost
  if (env.isBrowser) {
    return `http://localhost:${env.backendPort}`;
  }

  // En el backend, usar el host configurado
  return `http://${env.host}:${env.backendPort}`;
};

export default {
  // Puertos centralizados
  ports: {
    frontend: FRONTEND_PORT,
    backend: BACKEND_PORT,
  },

  // Configuración del servidor backend
  server: {
    port: BACKEND_PORT,
    host: '0.0.0.0', // El servidor escucha en todas las interfaces
    savedDir: "saved",
  },

  // Endpoints del backend
  backend: {
    baseUrl: getBackendUrl(),
    fillPdfEndpoint: "/api/fill-pdf",
    signEndpoint: "/api/sign",
    getSigningUrlEndpoint: "/api/getSigningUrl",
    healthEndpoint: "/api/health",
  },

  // Configuración de Python
  python: {
    executable: "python",
    script: "fill.py",
    flattenMode: "flatten",
  },

  // Configuración de OneSpan
  esignlive: {
    url: "https://sandbox.esignlive.com/api/packages",
  },
};
