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

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function downloadSimplePdf(filename: string, content: string) {
  const lines = content.split(/\r?\n/);
  const fontSize = 12;
  const lineHeight = 16;
  const startX = 72;
  const startY = 770;

  const textOps: string[] = [];
  lines.forEach((line, idx) => {
    const y = startY - idx * lineHeight;
    if (y < 72) return;
    textOps.push(`BT /F1 ${fontSize} Tf ${startX} ${y} Td (${escapePdfText(line)}) Tj ET`);
  });

  const stream = textOps.join("\n");
  const streamLen = stream.length;

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj");
  objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  objects.push(`5 0 obj << /Length ${streamLen} >> stream\n${stream}\nendstream endobj`);

  let pdf = "%PDF-1.4\n";
  const xref: number[] = [0];
  objects.forEach((obj) => {
    xref.push(pdf.length);
    pdf += obj + "\n";
  });

  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  xref.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += "trailer << /Size " + (objects.length + 1) + " /Root 1 0 R >>\n";
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF";

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
