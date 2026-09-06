import { houseAppearance, isSpecialResult } from "./selection-engine.js";
import { HOUSE_NAMES } from "./chart-engine.js";
import { buildRelationColumns } from "./relation-engine.js";

const THAI_MONTHS = [
  "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const COLORS = {
  ink: "#172033",
  muted: "#667085",
  navy: "#24314f",
  gold: "#a9771f",
  line: "#cbd5e1",
  label: "#eef1f5",
  green: "#196f45",
  greenSoft: "#e5f5eb",
  red: "#922337",
  redSoft: "#fdebed",
  blue: "#2f68a3",
  paper: "#ffffff",
};

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCard(ctx, x, y, width, height, fill, stroke = COLORS.line) {
  roundedRect(ctx, x, y, width, height, 11);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawCenteredText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(text), x, y);
}

function relationAppearance(style) {
  const strong = style.endsWith("-strong");
  if (style.startsWith("green")) return { color: COLORS.green, background: strong ? COLORS.greenSoft : null, strong };
  if (style.startsWith("red")) return { color: COLORS.red, background: strong ? COLORS.redSoft : null, strong };
  if (style.startsWith("blue")) return { color: COLORS.blue, background: null, strong };
  return { color: COLORS.ink, background: null, strong: false };
}

function drawRelation(ctx, relation, centerX, centerY) {
  if (!relation) return;
  const appearance = relationAppearance(relation.style);
  const font = `${appearance.strong ? 700 : 400} 18px Sarabun, "TH Sarabun New", sans-serif`;
  ctx.font = font;
  const textWidth = ctx.measureText(relation.name).width;
  if (appearance.background) {
    drawCard(ctx, centerX - textWidth / 2 - 10, centerY - 16, textWidth + 20, 32, appearance.background, null);
  }
  drawCenteredText(ctx, relation.name, centerX, centerY, font, appearance.color);
}

function formatEffectiveDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${THAI_MONTHS[month]} ${year + 543}`;
}

function safeFilename(value) {
  return String(value || "ไม่ระบุชื่อ")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "ไม่ระบุชื่อ";
}

function drawBaseRow(ctx, chart, baseNumber, y, height, layout, highlights) {
  const { outer, labelWidth, columnWidth, gap } = layout;
  drawCard(ctx, outer, y, labelWidth, height, COLORS.label, null);
  drawCenteredText(ctx, `ฐาน ${baseNumber}`, outer + labelWidth / 2, y + height / 2, '400 20px Sarabun, sans-serif', "#8792a3");

  chart.bases[baseNumber - 1].forEach((value, column) => {
    const x = outer + labelWidth + gap + column * (columnWidth + gap);
    const key = `${baseNumber}:${column + 1}`;
    const selected = highlights.selected.has(key);
    const related = highlights.related.has(key);
    if (baseNumber < 5 || baseNumber > 7 || selected || related) drawCard(ctx, x, y, columnWidth, height,
      selected ? "#eef4fc" : related ? "#fff9ec" : COLORS.paper,
      selected ? "#345a92" : related ? "#c69b43" : COLORS.line);
    const centerX = x + columnWidth / 2;
    const house = HOUSE_NAMES[baseNumber]?.[column] || "";

    if (baseNumber === 4) {
      drawCenteredText(ctx, value, centerX, y + height * 38 / 104, '700 32px Sarabun, sans-serif', COLORS.navy);
      drawCenteredText(ctx, chart.base4Names[column], centerX, y + height * 78 / 104, `${isSpecialResult(value) ? 700 : 400} 17px Sarabun, sans-serif`, isSpecialResult(value) ? "#725518" : "#000000");
    } else if (baseNumber >= 5 && baseNumber <= 7) {
      drawCenteredText(ctx, value, centerX, y + height / 2, '400 25px Sarabun, sans-serif', COLORS.navy);
    } else {
      drawCenteredText(ctx, house, centerX, y + height * 29 / 104, `${houseAppearance(baseNumber, column + 1).weight} 17px Sarabun, sans-serif`, houseAppearance(baseNumber, column + 1).color);
      drawCenteredText(ctx, value, centerX, y + height * 70 / 104, '700 32px Sarabun, sans-serif', COLORS.navy);
    }
  });
}

function drawRelationRow(ctx, chart, y, height, layout) {
  const { outer, labelWidth, columnWidth, gap } = layout;
  buildRelationColumns(chart).forEach(({ column, relations }) => {
    const x = outer + labelWidth + gap + (column - 1) * (columnWidth + gap);
    relations.forEach((relation, i) => drawRelation(ctx, relation, x + columnWidth / 2, y + height * (i + 1) / (relations.length + 1)));
  });
}

export async function createChartCanvas({ chart, calendar, personName, highlights = { selected: new Set(), related: new Set() } }) {
  if (!chart || !calendar) throw new Error("ยังไม่มีแผนผังสำหรับบันทึก");
  if (document.fonts?.ready) await document.fonts.ready;

  const width = 1800;
  const layout = {
    outer: 50,
    labelWidth: 92,
    gap: 10,
  };
  layout.columnWidth = (
    width - layout.outer * 2 - layout.labelWidth - layout.gap * 7
  ) / 7;

  const rowHeights = { regular: 98.8, compact: 54, relation: 48 };
  const chartStartY = 215;
  const chartHeight =
    rowHeights.regular * 6 +
    rowHeights.compact * 3 +
    rowHeights.relation +
    layout.gap * 9;
  const height = chartStartY + chartHeight + 72;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("เบราว์เซอร์ไม่รองรับการสร้างภาพ");

  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.gold;
  ctx.font = '700 22px Sarabun, sans-serif';
  ctx.fillText("โยราศาสตร์ วิทยา", layout.outer, 48);
  ctx.fillStyle = COLORS.ink;
  ctx.font = '700 43px Sarabun, sans-serif';
  ctx.fillText("แผนผังเลข 7 ตัว 9 ฐาน", layout.outer, 98);

  const input = calendar.input;
  const owner = personName?.trim() || "ไม่ระบุชื่อ";
  ctx.fillStyle = COLORS.muted;
  ctx.font = '400 21px Sarabun, sans-serif';
  ctx.fillText(
    `เจ้าชะตา: ${owner} · เกิด ${input.day} ${THAI_MONTHS[input.month]} ${input.yearBe} เวลา ${input.time} น.`,
    layout.outer,
    142,
  );
  ctx.fillText(
    `สุริยคติ: ${formatEffectiveDate(calendar.effectiveDate)} · ${calendar.weekday.name} · ${calendar.lunar.monthName} · ปี${calendar.zodiac.name} · รหัสชะตา ${chart.seeds.day} · ${chart.seeds.month} · ${chart.seeds.zodiac}`,
    layout.outer,
    178,
  );

  let y = chartStartY;
  for (let baseNumber = 1; baseNumber <= 9; baseNumber += 1) {
    const heightForRow = baseNumber >= 5 && baseNumber <= 7
      ? rowHeights.compact
      : rowHeights.regular;
    drawBaseRow(ctx, chart, baseNumber, y, heightForRow, layout, highlights);
    y += heightForRow + layout.gap;
    if (baseNumber === 3) {
      drawRelationRow(ctx, chart, y, rowHeights.relation, layout);
      y += rowHeights.relation + layout.gap;
    }
  }

  ctx.fillStyle = "#98a2b3";
  ctx.font = '400 16px Sarabun, sans-serif';
  ctx.textAlign = "right";
  ctx.fillText("Calendar Engine 1.0 · SevenStar-9Base", width - layout.outer, height - 28);
  return canvas;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("สร้างไฟล์ไม่สำเร็จ")),
      type,
      quality,
    );
  });
}

function concatBytes(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

export function buildPdfFromJpegBytes(jpegBytes, imageWidth, imageHeight) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let length = 0;
  const add = (value) => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };
  const addObject = (number, bodyParts) => {
    offsets[number] = length;
    add(`${number} 0 obj\n`);
    bodyParts.forEach(add);
    add("\nendobj\n");
  };

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 18;
  const scale = Math.min(
    (pageWidth - margin * 2) / imageWidth,
    (pageHeight - margin * 2) / imageHeight,
  );
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = (pageWidth - drawWidth) / 2;
  const drawY = (pageHeight - drawHeight) / 2;
  const content = `q ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm /Im0 Do Q`;
  const contentBytes = encoder.encode(content);

  add("%PDF-1.4\n%1234\n");
  addObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  addObject(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
  addObject(3, [
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] `,
    "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
  ]);
  addObject(4, [
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} `,
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    jpegBytes,
    "\nendstream",
  ]);
  addObject(5, [
    `<< /Length ${contentBytes.length} >>\nstream\n`,
    contentBytes,
    "\nendstream",
  ]);

  const xrefOffset = length;
  add("xref\n0 6\n0000000000 65535 f \n");
  for (let index = 1; index <= 5; index += 1) {
    add(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return concatBytes(chunks);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportChartAsPng(options) {
  const canvas = await createChartCanvas(options);
  const blob = await canvasToBlob(canvas, "image/png");
  downloadBlob(blob, `แผนผังเลข7ตัว9ฐาน-${safeFilename(options.personName)}.png`);
}

export async function exportChartAsPdf(options) {
  const canvas = await createChartCanvas(options);
  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.94);
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const pdfBytes = buildPdfFromJpegBytes(jpegBytes, canvas.width, canvas.height);
  downloadBlob(
    new Blob([pdfBytes], { type: "application/pdf" }),
    `แผนผังเลข7ตัว9ฐาน-${safeFilename(options.personName)}.pdf`,
  );
}
