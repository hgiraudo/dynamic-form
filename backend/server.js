// backend/server.js
import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { randomBytes } from "crypto";
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

// Carpeta de borradores de formulario
const APPLICATIONS_DIR = path.join(__dirname, "applications");
if (!fs.existsSync(APPLICATIONS_DIR)) fs.mkdirSync(APPLICATIONS_DIR, { recursive: true });

const VALID_APP_ID = /^[a-f0-9]{32}$/;

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
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

        py.stdout.on("data", (data) =>
          console.log(`[PY-OUT]: ${data.toString()}`)
        );
        py.stderr.on("data", (data) =>
          console.error(`[PY-ERR]: ${data.toString()}`)
        );
        py.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`Python exited ${code}`))
        );
      });

      const pdfBuffer = fs.readFileSync(outputPdf);

      if (responseType === "base64") {
        res.json({
          base64: pdfBuffer.toString("base64"),
          files: { inputPdf, jsonPath, outputPdf },
        });
      } else {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${timestamp}-output.pdf`
        );
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
    const apiKey = req.headers["x-onespan-api-key"];

    if (!apiKey) {
      return res
        .status(401)
        .json({ error: "X-OneSpan-API-Key header is required" });
    }

    console.log("📨 JSON recibido en /api/sign:", transactionJson);

    // ⚠️ Usar URL absoluta de OneSpan desde config
    const response = await fetch(config.esignlive.url, {
      method: "POST",
      headers: {
        Authorization: apiKey,
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
   ENDPOINT: /api/getSigningUrl  (OneSpan)
============================================================ */
app.post(config.backend.getSigningUrlEndpoint, async (req, res) => {
  try {
    const { packageId } = req.body;
    const apiKey = req.headers["x-onespan-api-key"];

    if (!apiKey) {
      return res
        .status(401)
        .json({ error: "X-OneSpan-API-Key header is required" });
    }

    if (!packageId)
      return res.status(400).json({ error: "packageId is required" });

    // ⚠️ URL de OneSpan
    const url = `${config.esignlive.url}/${packageId}/roles/Signer1/signingUrl`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Error OneSpan /signingUrl:", text);
      return res.status(response.status).send(text);
    }

    const data = await response.json();
    res.json({ signingUrl: data.url });
  } catch (err) {
    console.error("❌ Error en /api/getSigningUrl:", err);
    res.status(500).json({ error: "Error obteniendo URL de firma" });
  }
});

/* ============================================================
   ENDPOINTS: /api/applications  (guardar/cargar borradores)
============================================================ */

// Crear nuevo borrador → devuelve id hex de 32 chars (128 bits)
app.post(config.backend.applicationsEndpoint, async (req, res) => {
  try {
    const id = randomBytes(16).toString("hex");
    await fs.promises.writeFile(
      path.join(APPLICATIONS_DIR, `${id}.json`),
      JSON.stringify(req.body)
    );
    res.json({ id });
  } catch (err) {
    console.error("❌ Error creando aplicación:", err);
    res.status(500).json({ error: "Error al guardar" });
  }
});

// Actualizar borrador existente
app.put(`${config.backend.applicationsEndpoint}/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    if (!VALID_APP_ID.test(id)) return res.status(400).json({ error: "ID inválido" });
    const filePath = path.join(APPLICATIONS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "No encontrado" });
    await fs.promises.writeFile(filePath, JSON.stringify(req.body));
    res.json({ id });
  } catch (err) {
    console.error("❌ Error actualizando aplicación:", err);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

// Cargar borrador
app.get(`${config.backend.applicationsEndpoint}/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    if (!VALID_APP_ID.test(id)) return res.status(400).json({ error: "ID inválido" });
    const filePath = path.join(APPLICATIONS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "No encontrado" });
    const data = JSON.parse(await fs.promises.readFile(filePath, "utf-8"));
    res.json(data);
  } catch (err) {
    console.error("❌ Error cargando aplicación:", err);
    res.status(500).json({ error: "Error al cargar" });
  }
});

/* ============================================================
   ENDPOINT: /api/prefill/:company/:form  (pre-completar formulario via API)
============================================================ */
app.post(`${config.backend.prefillEndpoint}/:company/:form`, async (req, res) => {
  try {
    const { company, form } = req.params;
    const id = randomBytes(16).toString("hex");
    await fs.promises.writeFile(
      path.join(APPLICATIONS_DIR, `${id}.json`),
      JSON.stringify(req.body)
    );
    const proto  = req.get("x-forwarded-proto") || req.protocol;
    const host   = req.get("host") || "";
    const origin = `${proto}://${host}`;
    const isSubdomain = host.toLowerCase().startsWith(`${company}.`);
    const formPath = isSubdomain ? `/${form}` : `/${company}/${form}`;
    res.json({
      id,
      url: `${origin}${formPath}?app=${id}`,
    });
  } catch (err) {
    console.error("❌ Error en /api/prefill:", err);
    res.status(500).json({ error: "Error al guardar" });
  }
});

app.get(config.backend.deviceTypeEndpoint, (req, res) => {
  const ua = req.headers["user-agent"] || "";
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  res.json({ isMobile });
});

app.get(config.backend.healthEndpoint, (req, res) => {
  res.json({ status: "ok" });
});

/* ============================================================
   SERVIDOR
============================================================ */
const PORT = process.env.PORT || config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en ${config.backend.baseUrl}`);
  console.log(`   - POST ${config.backend.fillPdfEndpoint}`);
  console.log(`   - POST ${config.backend.signEndpoint}`);
  console.log(`   - POST ${config.backend.getSigningUrlEndpoint}`);
  console.log(`   - POST ${config.backend.healthEndpoint}`);
});
