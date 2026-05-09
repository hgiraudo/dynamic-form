const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(value);
}

export function isValidDate(ddmmyyyy) {
  if (!ddmmyyyy) return false;
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) return false;
  const d = Number(parts[0]), m = Number(parts[1]), y = Number(parts[2]);
  if (m < 1 || m > 12 || d < 1 || y < 1) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isValidMask(value, mask) {
  const digits = (value || "").replace(/\D/g, "").length;
  const expected = mask.split("").filter((c) => c === "#").length;
  return digits === expected;
}

export function isFieldInvalid(field, value) {
  if (!value) return false;
  if (field.type === "email") return !isValidEmail(value);
  if (field.type === "date") return !isValidDate(value);
  if (field.mask) return !isValidMask(value, field.mask);
  if (field.digits) return value.replace(/\D/g, "").length !== field.digits;
  return false;
}
