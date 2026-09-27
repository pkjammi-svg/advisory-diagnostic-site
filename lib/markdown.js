// Minimal, safe markdown -> HTML for solution write-ups.
// Supports: ## / ### headings, paragraphs, - bullets, 1. numbered lists,
// **bold**, *italic*, and | pipe | tables |. All text is HTML-escaped first.

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>");
}

function splitRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function markdownToHtml(md) {
  if (!md) return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (t === "") { i++; continue; }

    if (t.startsWith("### ")) { out.push(`<h3>${inline(t.slice(4))}</h3>`); i++; continue; }
    if (t.startsWith("## ")) { out.push(`<h2>${inline(t.slice(3))}</h2>`); i++; continue; }
    if (t.startsWith("# ")) { out.push(`<h2>${inline(t.slice(2))}</h2>`); i++; continue; }

    if (t.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(lines[i]); i++; }
      const header = splitRow(rows[0]);
      const body = rows.slice(1).filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r)).map(splitRow);
      out.push(
        `<div class="md-table"><table><thead><tr>${header.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>` +
          body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") +
          `</tbody></table></div>`
      );
      continue;
    }

    if (/^[-*] /.test(t)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) { items.push(lines[i].trim().slice(2)); i++; }
      out.push(`<ul>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+[.)] /.test(t)) {
      const items = [];
      while (i < lines.length && /^\d+[.)] /.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+[.)] /, "")); i++; }
      out.push(`<ol>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</ol>`);
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,3} |\||[-*] |\d+[.)] )/.test(lines[i].trim())) {
      para.push(lines[i].trim()); i++;
    }
    out.push(`<p>${para.map(inline).join("<br/>")}</p>`);
  }
  return out.join("\n");
}
