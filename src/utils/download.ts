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
  return value
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function toBytes(str: string) {
  return new TextEncoder().encode(str);
}

export function downloadSimplePdf(filename: string, content: string) {
  const lines = content.split(/\r?\n/);
  const fontSize = 11;
  const lineHeight = 14;
  const startX = 54;
  const startY = 780;

  const textOps: string[] = [];
  lines.forEach((line, idx) => {
    const y = startY - idx * lineHeight;
    if (y < 54) return;
    textOps.push(`BT /F1 ${fontSize} Tf ${startX} ${y} Td (${escapePdfText(line)}) Tj ET`);
  });

  const stream = textOps.join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj\r\n<< /Type /Catalog /Pages 2 0 R >>\r\nendobj");
  objects.push("2 0 obj\r\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\r\nendobj");
  objects.push("3 0 obj\r\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> >>\r\nendobj");
  objects.push("4 0 obj\r\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\r\nendobj");

  const streamBytes = toBytes(stream);
  const streamObj = `5 0 obj\r\n<< /Length ${streamBytes.length} >>\r\nstream\r\n${stream}\r\nendstream\r\nendobj`;
  objects.push(streamObj);

  const header = "%PDF-1.4\r\n";
  const parts: Uint8Array[] = [toBytes(header)];
  const xref: number[] = [0];
  let offset = parts[0].length;

  objects.forEach((obj) => {
    xref.push(offset);
    const bytes = toBytes(obj + "\r\n");
    parts.push(bytes);
    offset += bytes.length;
  });

  const xrefOffset = offset;
  const xrefLines: string[] = [];
  xrefLines.push("xref");
  xrefLines.push(`0 ${objects.length + 1}`);
  xrefLines.push("0000000000 65535 f ");
  xref.slice(1).forEach((off) => {
    xrefLines.push(`${String(off).padStart(10, "0")} 00000 n `);
  });
  const trailer = [
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    `${xrefOffset}`,
    "%%EOF",
  ].join("\r\n");

  parts.push(toBytes(xrefLines.join("\r\n") + "\r\n" + trailer));

  const blob = new Blob(parts, { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
