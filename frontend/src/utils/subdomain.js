const SUBDOMAIN_MAP = {
  allaria:   "allaria",
  bancocci:  "banco-occidente",
};

export function getCompanyFromHostname(hostname) {
  const parts = hostname.split(".");
  // Only treat as subdomain when there are at least 3 parts (sub.domain.tld)
  if (parts.length >= 3) {
    return SUBDOMAIN_MAP[parts[0].toLowerCase()] ?? null;
  }
  return null;
}
