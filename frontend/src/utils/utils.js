// Convierte cualquier formato interno → DD/MM/YYYY para mostrar y exportar
export const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) return dateInput;
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) return dateInput.replace(/-/g, "/");
  const [year, month, day] = dateInput.split("-");
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
};

// Normaliza cualquier formato guardado → DD/MM/YYYY (formato interno actual)
export const parseDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // Datos viejos en YYYY-MM-DD
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    // Datos guardados con el formato anterior DD-MM-YYYY
    return dateStr.replace(/-/g, "/");
  }
  return dateStr; // ya en DD/MM/YYYY u otro formato
};
