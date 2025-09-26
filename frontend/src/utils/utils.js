// src/utils/utils.js

export const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return "";

  // Si el input ya viene como dd-mm-yyyy, lo devolvemos directo
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
    return dateInput;
  }

  // Si viene como yyyy-mm-dd
  const [year, month, day] = dateInput.split("-");

  return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
};

// 🔹 Función auxiliar: convierte DD-MM-YYYY → YYYY-MM-DD
export const parseDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";
  const [dd, mm, yyyy] = dateStr.split("-");
  if (!dd || !mm || !yyyy) return dateStr; // si ya viene en formato válido
  return `${yyyy}-${mm}-${dd}`;
};
