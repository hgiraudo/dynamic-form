import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfPreviewModal({ base64Pdf, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl flex flex-col max-h-[95vh] w-full max-w-3xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <span className="font-semibold text-brand-primary">Vista previa del documento</span>
          <div className="flex items-center gap-3">
            {numPages && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <button
                  onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                  disabled={pageNumber <= 1}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
                >
                  ‹
                </button>
                <span>{pageNumber} / {numPages}</span>
                <button
                  onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))}
                  disabled={pageNumber >= numPages}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col items-center p-4 bg-gray-100">
          <Document
            file={`data:application/pdf;base64,${base64Pdf}`}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
            loading={<div className="p-12 text-gray-500 text-sm">Cargando documento...</div>}
            error={<div className="p-12 text-red-500 text-sm">Error al cargar el documento.</div>}
          >
            <Page
              pageNumber={pageNumber}
              width={Math.min(typeof window !== "undefined" ? window.innerWidth * 0.75 : 700, 700)}
              renderTextLayer={false}
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
