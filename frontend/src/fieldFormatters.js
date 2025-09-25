export const cuitFormatter = (value) => {
  if (!value) return "";
  let val = value.replace(/\D/g, ""); // quitar todo lo que no sea número
  if (val.length > 2) val = val.slice(0, 2) + "-" + val.slice(2);
  if (val.length > 11) val = val.slice(0, 11) + "-" + val.slice(11, 12);
  return val;
};
