// backend/config.general.js
export default {
  server: {
    port: 4000,
    savedDir: "saved",
  },
  endpoints: {
    fillPdf: "/api/fill-pdf",
    sign: "/api/sign",
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
