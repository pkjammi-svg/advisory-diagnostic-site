// Small CSV parser (handles quoted fields, commas and newlines inside quotes).
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x !== "")) rows.push(row);
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((h, i) => h.trim() || `Column ${i + 1}`);
  const records = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { headers, records };
}

export function toNumber(v) {
  if (v === null || v === undefined) return NaN;
  let s = String(v).trim();
  const neg = /^\(.*\)$/.test(s);
  s = s.replace(/[(),\s₹$€£]|Rs\.?|INR/gi, "");
  const n = Number(s);
  return neg ? -n : n;
}

// Group records by a dimension column and total a numeric column.
export function summarise(records, dimension, metric) {
  const groups = new Map();
  for (const r of records) {
    const key = r[dimension] || "(blank)";
    const val = metric ? toNumber(r[metric]) : 1;
    const g = groups.get(key) || { key, total: 0, count: 0 };
    if (Number.isFinite(val)) g.total += val;
    g.count += 1;
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => b.total - a.total);
  const grand = list.reduce((s, g) => s + g.total, 0);
  let running = 0;
  return {
    grand,
    rows: list.map((g) => {
      running += g.total;
      return {
        ...g,
        average: g.count ? g.total / g.count : 0,
        share: grand ? (g.total / grand) * 100 : 0,
        cumulativeShare: grand ? (running / grand) * 100 : 0
      };
    })
  };
}

export function numericColumns(headers, records) {
  const sample = records.slice(0, 200);
  return headers.filter((h) => {
    const vals = sample.map((r) => r[h]).filter((v) => v !== "");
    return vals.length > 0 && vals.filter((v) => Number.isFinite(toNumber(v))).length / vals.length >= 0.7;
  });
}
