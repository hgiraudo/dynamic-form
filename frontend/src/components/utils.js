// utils.js
export const splitEmail = (email) => {
  if (!email || !email.includes("@")) return { user: "", domain: "" };
  const [user, domain] = email.split("@");
  return { user, domain };
};

// 🔹 Formateo de fechas (dd-mm-yyyy)
export const formatDate = (value) => {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return value;
};

// 🔹 Convierte boolean en "X" o ""
export const boolToSlash = (value) => (value ? "/" : "");
