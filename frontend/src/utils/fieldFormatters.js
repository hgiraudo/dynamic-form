export const applyMask = (input, mask) => {
  const digits = (input || "").replace(/\D/g, "");
  let result = "";
  let di = 0;
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    if (mask[i] === "#") result += digits[di++];
    else result += mask[i];
  }
  return result;
};

export const cbuFormatter = (value) => {
  if (!value) return "";
  return value.replace(/\D/g, "").slice(0, 22);
};

export const cuitFormatter = (value) => {
  if (!value) return "";
  let val = value.replace(/\D/g, "");
  if (val.length > 2) val = val.slice(0, 2) + "-" + val.slice(2);
  if (val.length > 11) val = val.slice(0, 11) + "-" + val.slice(11, 12);
  return val;
};

export const thousandsFormatter = (value) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
