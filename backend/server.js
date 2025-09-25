// backend/server.js
import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import sharedConfig from "../shared/config.general.js"; // endpoints compartidos

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const __dirname = path.resolve();

// 🔹 Configuración
const PORT = process.env.PORT || 4000;
const SAVED_DIR = path.join(__dirname, "saved");
if (!fs.existsSync(SAVED_DIR)) fs.mkdirSync(SAVED_DIR, { recursive: true });

// 🔹 Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 🔹 Función timestamp
function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${year}-${month}-${day} ${hours}.${minutes}.${seconds}`;
}

/* ============================================================
   📌 ENDPOINT: /api/fill-pdf
   ============================================================ */
app.post(
  "/api/fill-pdf",
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

      // 🔹 Ejecutar script Python
      await new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, "fill.py");
        const py = spawn("python", [scriptPath, inputPdf, jsonPath, outputPdf, "flatten"]);

        py.stdout.on("data", (data) => console.log(`[PY-OUT]: ${data.toString()}`));
        py.stderr.on("data", (data) => console.error(`[PY-ERR]: ${data.toString()}`));
        py.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Python exited ${code}`))));
      });

      const pdfBuffer = fs.readFileSync(outputPdf);

      if (responseType === "base64") {
        res.json({ base64: pdfBuffer.toString("base64"), files: { inputPdf, jsonPath, outputPdf } });
      } else {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${timestamp}-output.pdf`);
        res.send(pdfBuffer);
      }

      // 🧹 Eliminar temporales
      fs.unlinkSync(tmpPdf);
      fs.unlinkSync(tmpJson);
    } catch (err) {
      console.error("❌ Error en /api/fill-pdf:", err);
      res.status(500).json({ error: "Error al generar PDF" });
    }
  }
);

/* ============================================================
   📌 ENDPOINT: /api/sign
   ============================================================ */
app.post("/api/sign", async (req, res) => {
  try {
    const transactionJson = req.body;
    console.log("📨 JSON recibido en /api/sign:", transactionJson);

    const response = await fetch(sharedConfig.endpoints.sign, {
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
   🚀 Iniciar servidor
   ============================================================ */
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
  console.log("   - POST /api/fill-pdf");
  console.log("   - POST /api/sign");
});
