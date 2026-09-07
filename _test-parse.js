const fs = require("fs");
const https = require("https");
const url =
  "https://docs.google.com/spreadsheets/d/1dQVdYuAjC3k3SNLjBEp_FP-qYfOEsb8Nkcr0tMTJ5bg/export?format=csv&gid=452601094";

function fetchText(u) {
  return new Promise((resolve, reject) => {
    https
      .get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchText(res.headers.location).then(resolve, reject);
        }
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      })
      .on("error", reject);
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQ) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function toNum(v) {
  if (v == null || v === "") return 0;
  const s = String(v).trim().replace(/%/g, "").replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function toPct(v) {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  const n = toNum(s);
  if (s.includes("%") || n > 1) return n / 100;
  return n;
}
function cell(rows, r, c) {
  return (rows[r] && rows[r][c] != null ? String(rows[r][c]) : "").trim();
}

(async () => {
  const text = await fetchText(url);
  const rows = parseCsv(text);
  const kpiRow = 6;
  const comps = [];
  const mods = [];
  for (let r = 11; r < rows.length; r++) {
    const kode = cell(rows, r, 1);
    const id = cell(rows, r, 7);
    if (/^[A-F]$/.test(kode))
      comps.push(kode + ":" + Math.round(toPct(cell(rows, r, 3)) * 1000) / 10);
    if (id && /^[A-F]\.\d+$/i.test(id)) mods.push(id);
    if (cell(rows, r, 1).startsWith("METODE:")) break;
  }
  console.log({
    overall: toPct(cell(rows, kpiRow, 1)),
    berjalan: toNum(cell(rows, kpiRow, 9)),
    belum: toNum(cell(rows, kpiRow, 10)),
    oh: toNum(cell(rows, kpiRow, 12)),
    util: toPct(cell(rows, kpiRow, 15)),
    comps,
    mods: mods.length,
  });
})();
