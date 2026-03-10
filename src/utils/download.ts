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
  const rows = lines.slice(headerIndex + 1).map(parseCsvLine).map((row) => row.map((v) => v.replace(/^"|"$/g, "")));
  return { metaLines, headers, rows };
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
  const fontSize = 10;
  const lineHeight = 14;
  const marginX = 36;
  const marginY = 36;

  let y = height - marginY;
  metaLines.forEach((line) => {
    page.drawText(line, { x: marginX, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  });
  y -= 4;

  const colCount = headers.length;
  const availableWidth = width - marginX * 2;
  const colWidths = new Array(colCount).fill(Math.floor(availableWidth / colCount));
  colWidths[colCount - 1] += availableWidth - colWidths.reduce((a, b) => a + b, 0);

  page.drawRectangle({
    x: marginX,
    y: y - lineHeight + 2,
    width: availableWidth,
    height: lineHeight + 4,
    color: rgb(0.93, 0.95, 0.98),
  });

  let x = marginX;
  headers.forEach((h, idx) => {
    page.drawText(h, { x: x + 4, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
    x += colWidths[idx];
  });
  y -= lineHeight + 6;

  let rowCount = 0;
  for (let i = startRow; i < rows.length; i += 1) {
    if (y < marginY + lineHeight) break;
    x = marginX;
    const row = rows[i];
    row.forEach((cell, idx) => {
      const text = cell.length > 60 ? `${cell.slice(0, 57)}...` : cell;
      page.drawText(text, { x: x + 4, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
      x += colWidths[idx];
    });
    y -= lineHeight;
    rowCount += 1;
  }
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
