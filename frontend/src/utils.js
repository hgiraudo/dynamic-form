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
