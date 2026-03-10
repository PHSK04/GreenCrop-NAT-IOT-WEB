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

function wrapText(text: string, maxWidth: number, font: any, size: number) {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
      } else {
        // hard break long word
        let chunk = "";
        for (const ch of word) {
          const t = chunk + ch;
          if (font.widthOfTextAtSize(t, size) <= maxWidth) {
            chunk = t;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        line = chunk;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
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
  const fontSize = 9;
  const lineHeight = 12;
  const marginX = 36;
  const marginY = 36;
  const gridColor = rgb(0.85, 0.85, 0.85);

  let y = height - marginY;
  metaLines.forEach((line) => {
    page.drawText(line, { x: marginX, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  });
  y -= 4;

  const colCount = headers.length;
  const availableWidth = width - marginX * 2;
  const weightMap: Record<string, number> = {
    date: 1.2,
    time: 1.2,
    timestamp: 1.5,
    type: 1.0,
    title: 1.4,
    detail: 2.0,
    device: 1.1,
    browser: 2.2,
    ip: 1.2,
  };
  const weights = headers.map((h) => weightMap[h.toLowerCase()] || 1.0);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const colWidths = weights.map((w) => Math.floor((availableWidth * w) / totalWeight));
  colWidths[colCount - 1] += availableWidth - colWidths.reduce((a, b) => a + b, 0);

  page.drawRectangle({
    x: marginX,
    y: y - lineHeight + 2,
    width: availableWidth,
    height: lineHeight + 4,
    color: rgb(0.85, 0.16, 0.16),
  });

  let x = marginX;
  headers.forEach((h, idx) => {
    page.drawText(h.toUpperCase(), { x: x + 4, y, size: fontSize, font, color: rgb(1, 1, 1) });
    x += colWidths[idx];
  });
  const headerTop = y + 4;
  y -= lineHeight + 6;
  const headerBottom = y + 6 - lineHeight;

  let rowCount = 0;
  const rowHeights: number[] = [];
  for (let i = startRow; i < rows.length; i += 1) {
    if (y < marginY + lineHeight) break;
    x = marginX;
    const row = rows[i];
    const wrapped = row.map((cell, idx) => wrapText(cell, colWidths[idx] - 8, font, fontSize));
    const maxLines = Math.max(...wrapped.map((w) => w.length), 1);
    const rowHeight = maxLines * lineHeight;
    if (y - rowHeight < marginY) break;
    wrapped.forEach((lines, idx) => {
      let yy = y;
      lines.forEach((line) => {
        page.drawText(line, { x: x + 4, y: yy, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        yy -= lineHeight;
      });
      x += colWidths[idx];
    });
    rowHeights.push(rowHeight);
    y -= rowHeight;
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
