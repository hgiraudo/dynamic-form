// backend/server.js
import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import config from "../shared/config.general.js";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const __dirname = path.resolve();

// Limite de request
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// Carpeta donde se guardan los PDFs y JSON
const SAVED_DIR = path.join(__dirname, config.server.savedDir);
if (!fs.existsSync(SAVED_DIR)) fs.mkdirSync(SAVED_DIR, { recursive: true });

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
}

/* ============================================================
   ENDPOINT: /api/fill-pdf
============================================================ */
app.post(
  config.backend.fillPdfEndpoint,
  upload.fields([{ name: "pdf" }, { name: "json" }]),
  async (req, res) => {
    try {
      if (!req.files?.pdf?.[0] || !req.files?.json?.[0])
        return res.status(400).json({ error: "Faltan PDF o JSON" });

      const timestamp = getTimestamp();
      const tmpPdf = req.files.pdf[0].path;
      const tmpJson = req.files.json[0].path;

      const inputPdf = path.join(SAVED_DIR, `${timestamp}-input.pdf`);
      const jsonPath = path.join(SAVED_DIR, `${timestamp}-datos.json`);
      const outputPdf = path.join(SAVED_DIR, `${timestamp}-output.pdf`);

      fs.copyFileSync(tmpPdf, inputPdf);
      fs.copyFileSync(tmpJson, jsonPath);

      const responseType = req.body.responseType || "pdf";

      // Ejecutar script Python
      await new Promise((resolve, reject) => {
        const py = spawn(config.python.executable, [
          path.join(__dirname, config.python.script),
          inputPdf,
          jsonPath,
          outputPdf,
          config.python.flattenMode,
        ]);

        py.stdout.on("data", (data) => console.log(`[PY-OUT]: ${data.toString()}`));
        py.stderr.on("data", (data) => console.error(`[PY-ERR]: ${data.toString()}`));
        py.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Python exited ${code}`))));
      });

      const pdfBuffer = fs.readFileSync(outputPdf);

      if (responseType === "base64") {
        res.json({
          base64: pdfBuffer.toString("base64"),
          files: { inputPdf, jsonPath, outputPdf },
        });
      } else {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${timestamp}-output.pdf`);
        res.send(pdfBuffer);
      }

      fs.unlinkSync(tmpPdf);
      fs.unlinkSync(tmpJson);
    } catch (err) {
      console.error("❌ Error en /api/fill-pdf:", err);
      res.status(500).json({ error: "Error al generar PDF" });
    }
  }
);

/* ============================================================
   ENDPOINT: /api/sign  (OneSpan)
============================================================ */
app.post(config.backend.signEndpoint, async (req, res) => {
  try {
    const transactionJson = req.body;
    console.log("📨 JSON recibido en /api/sign:", transactionJson);

    // ⚠️ Usar URL absoluta de OneSpan desde config
    const response = await fetch(config.esignlive.url, {
      method: "POST",
      headers: {
        Authorization: process.env.ONESPAN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionJson),
    });

    const data = await response.json();
    console.log("📩 Respuesta OneSpan:", data);

    res.status(response.status).json(data);
  } catch (error) {
    console.error("❌ Error en /api/sign:", error);
    res.status(500).json({ error: "Error comunicando con OneSpan" });
  }
});

/* ============================================================
   SERVIDOR
============================================================ */
const PORT = process.env.PORT || config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en ${config.backend.baseUrl}`);
  console.log(`   - POST ${config.backend.fillPdfEndpoint}`);
  console.log(`   - POST ${config.backend.signEndpoint}`);
});
