// src/utils/utils.js

/**
 * 🔹 Divide un email en usuario y dominio
 * @param {string} email - email completo "usuario@dominio.com"
 * @returns {{user: string, domain: string}}
 */
export const splitEmail = (email) => {
  const [user, domain] = email.split("@");
  return { user: user || "", domain: domain || "" };
};

/**
 * 🔹 Convierte una fecha a string "yyyy-MM-dd"
 * @param {string | Date} date
 * @returns {string}
 */
export const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * 🔹 Convierte un booleano a "/" si true, "" si false
 * @param {boolean} value
 * @returns {string}
 */
export const boolToSlash = (value) => (value ? "/" : "");

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
