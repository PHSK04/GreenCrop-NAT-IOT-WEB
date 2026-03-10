import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

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
