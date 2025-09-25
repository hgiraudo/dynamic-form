// backend/config.general.js
export default {
  server: {
    port: 4000,
    savedDir: "saved",
  },
  backend: {
    baseUrl: "http://localhost:4000",
    fillPdfEndpoint: "/api/fill-pdf",
    signEndpoint: "/api/sign",
  },
  python: {
    executable: "python",
    script: "fill.py",
    flattenMode: "flatten",
  },
  esignlive: {
    url: "https://sandbox.esignlive.com/api/packages",
  },
};
