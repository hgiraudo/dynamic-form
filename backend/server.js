/**
 * API: /api/fill-pdf  
 *
 * 📌 Descripción:
 *   - Recibe un PDF base y un JSON con datos para rellenar campos.
 *   - Llama a un script Python para generar el PDF completo.
 *   - Devuelve el PDF final en binario o base64.
 *   - Guarda en disco:
 *       1) JSON recibido
 *       2) PDF base recibido
 *       3) PDF final generado
 *
 * --------------------------------------------------------
 *
 * API: /api/sign  
 *
 * 📌 Descripción:
 *   - Recibe desde el frontend el objeto `transactionJson`.
 *   - Envía ese JSON a OneSpan (sandbox.esignlive.com) usando la API REST.
 *   - Devuelve al frontend la respuesta de OneSpan.
 *
 * 🚨 Importante:
 *   - El frontend NO debe llamar directo a OneSpan → lo bloquea CORS.
 *   - Siempre debe llamar a este endpoint backend `/api/sign`.
 *
 * 🔐 Configuración:
 *   - Guardar tu API KEY en una variable de entorno `ONESPAN_API_KEY`.
 *   - Ejemplo en Windows (PowerShell):
 *        $env:ONESPAN_API_KEY="tu_api_key_aqui"
 *   - Ejemplo en Linux/Mac:
 *        export ONESPAN_API_KEY="tu_api_key_aqui"
 */

import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";
import fetch from "node-fetch"; // 👈 para llamar a OneSpan
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const __dirname = path.resolve();

// 🔹 Aumentar límite de request
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 📌 Middleware
app.use(cors());              // habilita CORS
app.use(express.json());      // para parsear JSON en body

// 📌 Carpeta donde se guardan los archivos definitivos
const SAVED_DIR = path.join(__dirname, "saved");
if (!fs.existsSync(SAVED_DIR)) {
  fs.mkdirSync(SAVED_DIR, { recursive: true });
}

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
      if (!req.files?.pdf?.[0] || !req.files?.json?.[0]) {
        return res.status(400).json({ error: "Faltan PDF o JSON" });
      }

      // 📌 Generar timestamp único
      const timestamp = getTimestamp();

      // Paths temporales (multer)
      const tmpPdf = req.files.pdf[0].path;
      const tmpJson = req.files.json[0].path;

      // Paths definitivos en carpeta /saved
      const inputPdf = path.join(SAVED_DIR, `${timestamp}-input.pdf`);
      const jsonPath = path.join(SAVED_DIR, `${timestamp}-datos.json`);
      const outputPdf = path.join(SAVED_DIR, `${timestamp}-output.pdf`);

      // Guardar copias de entrada
      fs.copyFileSync(tmpPdf, inputPdf);
      fs.copyFileSync(tmpJson, jsonPath);

      const responseType = req.body.responseType || "pdf";

      // 🔹 Ejecutar script Python
      await new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, "fill.py");
        const py = spawn("python", [
          scriptPath,
          inputPdf,
          jsonPath,
          outputPdf,
          "flatten",
        ]);

        py.stdout.on("data", (data) =>
          console.log(`[PY-OUT]: ${data.toString()}`)
        );
        py.stderr.on("data", (data) =>
          console.error(`[PY-ERR]: ${data.toString()}`)
        );
        py.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Python process exited with ${code}`));
        });
      });

      // 🔹 Leer el PDF generado
      const pdfBuffer = fs.readFileSync(outputPdf);

      if (responseType === "base64") {
        res.json({
          base64: pdfBuffer.toString("base64"),
          files: {
            inputPdf,
            jsonPath,
            outputPdf,
          },
        });
      } else {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${timestamp}-output.pdf`
        );
        res.send(pdfBuffer);
      }

      // 🧹 Eliminar temporales de multer
      fs.unlinkSync(tmpPdf);
      fs.unlinkSync(tmpJson);
    } catch (err) {
      console.error("❌ Error en /api/fill-pdf:", err);
      res.status(500).json({ error: "Error al generar PDF" });
    }
  }
);

/* ============================================================
   📌 ENDPOINT: /api/sign  (OneSpan)
   ============================================================ */
app.post("/api/sign", async (req, res) => {
  try {
    const transactionJson = req.body;
    console.log("📨 JSON recibido en /api/sign:", transactionJson);

    const response = await fetch(
      "https://sandbox.esignlive.com/api/packages",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${process.env.ONESPAN_API_KEY}`, // ⚠️ API KEY en .env
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionJson),
      }
    );

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
app.listen(4000, () => {
  console.log("🚀 Servidor en http://localhost:4000");
  console.log("   - POST /api/fill-pdf");
  console.log("   - POST /api/sign");
});
