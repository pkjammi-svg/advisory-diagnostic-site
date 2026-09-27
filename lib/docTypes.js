import { SERVICES } from "./services";

// Which upload slots are valid for an engagement.
export function allowedDocType(eng, docType, isAdmin) {
  if (docType === "deliverable") return isAdmin;
  if (docType === "other") return true;
  if (docType.startsWith("req:")) return (eng.requests || []).some((r) => `req:${r.id}` === docType);
  return SERVICES[eng.service].documents.some((d) => d.key === docType);
}

export function safeFileName(name) {
  return String(name || "file").replace(/[^\w.\-]+/g, "_").slice(-120) || "file";
}
