import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type CsvTable = {
  metaLines: string[];
  headers: string[];
  rows: string[][];
};

function parseCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsvTable(content: string): CsvTable | null {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headerIndex = lines.findIndex((l) => l.startsWith("\"timestamp\"") || l.startsWith("timestamp,"));
  if (headerIndex === -1) return null;
  const metaLines = lines.slice(0, headerIndex);
  const headers = parseCsvLine(lines[headerIndex]).map((v) => v.replace(/^"|"$/g, ""));
  const rows = lines
    .slice(headerIndex + 1)
    .map(parseCsvLine)
    .map((row) => row.map((v) => v.replace(/^"|"$/g, "")));

  if (headers[0]?.toLowerCase() === "timestamp") {
    const newHeaders = ["date", "time", ...headers.slice(1)];
    const newRows = rows.map((row) => {
      const ts = row[0];
      const d = new Date(ts);
      const date = Number.isNaN(d.getTime()) ? ts : d.toISOString().slice(0, 10);
      const time = Number.isNaN(d.getTime())
        ? "-"
        : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
      return [date, time, ...row.slice(1)];
    });
    return { metaLines, headers: newHeaders, rows: newRows };
  }

  return { metaLines, headers, rows };
}

function truncateToWidth(text: string, maxWidth: number, font: any, size: number) {
  if (!text) return "";
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = "...";
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, size);
  let out = "";
  for (const ch of text) {
    const next = out + ch;
    if (font.widthOfTextAtSize(next, size) + ellipsisWidth > maxWidth) {
      return out + ellipsis;
    }
    out = next;
  }
  return out;
}

function resolveColumnWeights(headers: string[]) {
  const normalize = (h: string) => h.trim().toLowerCase();
  return headers.map((h) => {
    const key = normalize(h);
    if (key.includes("date") || key.includes("time") || key.includes("timestamp")) return 1.2;
    if (key === "id" || key.endsWith("_id")) return 0.85;
    if (key.includes("name")) return 1.6;
    if (key.includes("email")) return 2.2;
    if (key.includes("detail") || key.includes("description") || key.includes("note")) return 2.2;
    if (key.includes("device")) return 1.2;
    if (key.includes("browser") || key.includes("os")) return 2.0;
    if (key.includes("status")) return 1.1;
    if (key.includes("action") || key.includes("type") || key.includes("role")) return 1.1;
    if (key.includes("location")) return 1.1;
    return 1.0;
  });
}

function computeColumnWidths(headers: string[], availableWidth: number) {
  const colCount = headers.length;
  const weights = resolveColumnWeights(headers);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let colWidths = weights.map((w) => Math.floor((availableWidth * w) / totalWeight));
  const minWidth = colCount >= 8 ? 70 : 80;

  let minTotal = minWidth * colCount;
  if (minTotal > availableWidth) {
    const shrinkMin = Math.max(48, Math.floor(availableWidth / colCount));
    minTotal = shrinkMin * colCount;
    colWidths = colWidths.map(() => shrinkMin);
  } else {
    let deficit = 0;
    colWidths = colWidths.map((w) => {
      if (w < minWidth) {
        deficit += minWidth - w;
        return minWidth;
      }
      return w;
    });
    if (deficit > 0) {
      const adjustable = colWidths
        .map((w, i) => ({ w, i }))
        .filter((c) => c.w > minWidth);
      const adjustableTotal = adjustable.reduce((a, c) => a + (c.w - minWidth), 0) || 1;
      adjustable.forEach(({ w, i }) => {
        const reducible = w - minWidth;
        const cut = Math.min(reducible, Math.floor((deficit * reducible) / adjustableTotal));
        colWidths[i] = w - cut;
      });
    }
  }

  const total = colWidths.reduce((a, b) => a + b, 0);
  colWidths[colCount - 1] += availableWidth - total;
  return colWidths;
}

function drawTablePage(params: {
  pdfDoc: PDFDocument;
  headers: string[];
  rows: string[][];
  metaLines: string[];
  startRow: number;
  font: any;
}): number {
  const { pdfDoc, headers, rows, metaLines, startRow, font } = params;
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const width = page.getWidth();
  const height = page.getHeight();
  const fontSize = headers.length >= 8 ? 9 : 10;
  const lineHeight = fontSize + 4;
  const marginX = 36;
  const marginY = 36;
  const gridColor = rgb(0.85, 0.85, 0.85);

  let y = height - marginY;
  metaLines.forEach((line) => {
    page.drawText(line, { x: marginX, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  });
  y -= 4;

  const availableWidth = width - marginX * 2;
  const colWidths = computeColumnWidths(headers, availableWidth);

  const headerHeight = lineHeight + 10;
  const headerTop = y + 4;
  const headerBottom = headerTop - headerHeight;
  page.drawRectangle({
    x: marginX,
    y: headerBottom,
    width: availableWidth,
    height: headerHeight,
    color: rgb(0.02, 0.62, 0.38),
  });

  let x = marginX;
  const headerTextY = headerBottom + (headerHeight - fontSize) / 2 + 0.5;
  headers.forEach((h, idx) => {
    page.drawText(h.toUpperCase(), { x: x + 4, y: headerTextY, size: fontSize, font, color: rgb(1, 1, 1) });
    x += colWidths[idx];
  });
  y = headerBottom;

  let rowCount = 0;
  const rowHeights: number[] = [];
  for (let i = startRow; i < rows.length; i += 1) {
    const rowHeight = lineHeight + 8;
    const rowTop = y;
    const rowBottom = y - rowHeight;
    if (rowBottom < marginY) break;
    x = marginX;
    const row = rows[i];
    const textY = rowBottom + (rowHeight - fontSize) / 2 - 1;
    row.forEach((cell, idx) => {
      const text = truncateToWidth(cell, colWidths[idx] - 8, font, fontSize);
      page.drawText(text, { x: x + 4, y: textY, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
      x += colWidths[idx];
    });
    rowHeights.push(rowHeight);
    y = rowBottom;
    rowCount += 1;
  }
  const tableBottom = y;
  const tableTop = headerTop;

  // Vertical grid lines
  let vx = marginX;
  page.drawLine({ start: { x: vx, y: tableBottom }, end: { x: vx, y: tableTop }, thickness: 0.5, color: gridColor });
  colWidths.forEach((w) => {
    vx += w;
    page.drawLine({ start: { x: vx, y: tableBottom }, end: { x: vx, y: tableTop }, thickness: 0.5, color: gridColor });
  });

  // Horizontal grid lines (header bottom + each row)
  page.drawLine({ start: { x: marginX, y: headerBottom }, end: { x: marginX + availableWidth, y: headerBottom }, thickness: 0.5, color: gridColor });
  let hy = headerBottom;
  rowHeights.forEach((h) => {
    hy -= h;
    page.drawLine({ start: { x: marginX, y: hy }, end: { x: marginX + availableWidth, y: hy }, thickness: 0.5, color: gridColor });
  });
  return rowCount;
}

export function downloadTextFile(filename: string, content: string, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadSimplePdf(filename: string, content: string) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const table = parseCsvTable(content);
  if (table) {
    let startRow = 0;
    while (startRow < table.rows.length) {
      const rowsDrawn = drawTablePage({
        pdfDoc,
        headers: table.headers,
        rows: table.rows,
        metaLines: table.metaLines,
        startRow,
        font,
      });
      startRow += rowsDrawn;
      if (rowsDrawn === 0) break;
    }
  } else {
    const page = pdfDoc.addPage([612, 792]);
    const fontSize = 11;
    const lineHeight = 14;
    const marginX = 54;
    const marginY = 54;
    const maxY = 792 - marginY;

    const lines = content.split(/\r?\n/);
    let y = maxY;
    lines.forEach((line) => {
      if (y < marginY) return;
      page.drawText(line, { x: marginX, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    });
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
