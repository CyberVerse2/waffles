#!/usr/bin/env node
// Builds world-cup-campaign-plan.pdf from world-cup-campaign-plan.md.
// Dependency-free: a small Markdown->HTML pass + headless Chrome to print PDF.
// Run:  node docs/build-plan-pdf.mjs
// Edit the .md, re-run this, and the PDF updates.

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const MD = join(DIR, "world-cup-campaign-plan.md");
const HTML = join(DIR, ".world-cup-campaign-plan.build.html");
const PDF = join(DIR, "world-cup-campaign-plan.pdf");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inline: **bold**, *italic*, `code`. (Escapes HTML first.)
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+?)\*/g, "$1<em>$2</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const isTableSep = (l) => /^\s*\|?\s*:?-{2,}.*\|/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    // Headings
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
      i++; continue;
    }

    // Blockquote (one or more consecutive > lines)
    if (line.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Table: header row containing | followed by a separator row
    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const cells = (l) =>
        l.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
      const header = cells(line);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(cells(lines[i]));
        i++;
      }
      let t = "<table><thead><tr>";
      t += header.map((h) => `<th>${inline(h)}</th>`).join("");
      t += "</tr></thead><tbody>";
      for (const r of rows) {
        t += "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>";
      }
      t += "</tbody></table>";
      out.push(t);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { out.push("<hr/>"); i++; continue; }

    // Paragraph (gather until blank line)
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,4}\s|>|\s*[-*]\s)/.test(lines[i]) && !lines[i].includes("|")) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

const CSS = `
  :root{--maple:#FFC931;--pitch:#2bbf5b;--pitch-dark:#1f8f44;--ink:#14201a;--mute:#4b5a52;--faint:#8a978f;--line:#e4e9e6;}
  *{box-sizing:border-box}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:var(--ink);font-size:11.4px;line-height:1.6}
  @page{size:A4;margin:18mm 16mm}
  h1{font-family:"Arial Black",sans-serif;font-size:30px;line-height:1.05;margin:0 0 4px;color:var(--ink)}
  h1 + p{color:var(--faint);font-size:11px;margin:0 0 18px}
  h2{font-family:"Arial Black",sans-serif;font-size:18px;margin:24px 0 10px;padding-bottom:6px;border-bottom:3px solid var(--maple);page-break-after:avoid}
  h3{font-family:"Arial Black",sans-serif;font-size:12.5px;margin:16px 0 4px;color:var(--pitch-dark);page-break-after:avoid}
  p{margin:0 0 9px}
  strong{color:var(--ink)}
  ul{margin:0 0 11px;padding-left:18px}
  li{margin:0 0 4px}
  blockquote{margin:10px 0;background:rgba(255,201,49,.10);border:1px solid rgba(255,201,49,.4);border-radius:10px;padding:12px 14px}
  blockquote p{margin:0}
  code{font-family:ui-monospace,Menlo,monospace;background:#f1f5f3;border-radius:4px;padding:1px 4px;font-size:10px}
  table{width:100%;border-collapse:collapse;margin:8px 0 12px;font-size:10.8px}
  th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}
  th{background:#f1f5f3;font-weight:800}
  section,table,blockquote,ul{page-break-inside:avoid}
`;

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Waffles — World Cup Plan</title><style>${CSS}</style></head><body>${mdToHtml(readFileSync(MD, "utf8"))}</body></html>`;

writeFileSync(HTML, html);
execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${PDF}`, HTML], { stdio: "ignore" });
console.log("Built", PDF);
