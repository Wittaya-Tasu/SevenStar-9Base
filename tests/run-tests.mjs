import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateAge, calculateCalendar, setCalendarDatasetForTests } from "../js/calendar-engine.js";
import { calculateNineBases } from "../js/chart-engine.js";
import {
  buildRelationColumns,
  getBadNumbers,
  getLinkedCellKeys,
  getRelations,
} from "../js/relation-engine.js";
import { buildPdfFromJpegBytes } from "../js/export-engine.js";

const dataset = JSON.parse(await readFile(new URL("../data/lunar-month-boundaries.json", import.meta.url), "utf8"));
setCalendarDatasetForTests(dataset);

const beforeSix = await calculateCalendar({ day: 22, month: 4, yearBe: 2527, time: "01:49" });
assert.equal(beforeSix.effectiveDate, "1984-04-21");
assert.deepEqual(beforeSix.seeds, { day: 7, month: 5, zodiac: 1 });
assert.equal(beforeSix.weekday.name, "เสาร์");
assert.equal(beforeSix.lunar.monthNumber, 5);
assert.equal(beforeSix.zodiac.name, "ชวด");

const afterSix = await calculateCalendar({ day: 22, month: 4, yearBe: 2527, time: "08:00" });
assert.equal(afterSix.effectiveDate, "1984-04-22");
assert.deepEqual(afterSix.seeds, { day: 1, month: 5, zodiac: 1 });
assert.equal(afterSix.weekday.name, "อาทิตย์");

const chart = calculateNineBases(7, 5, 1);
assert.deepEqual(chart.bases[0], [7, 1, 2, 3, 4, 5, 6]);
assert.deepEqual(chart.bases[1], [5, 6, 7, 1, 2, 3, 4]);
assert.deepEqual(chart.bases[2], [1, 2, 3, 4, 5, 6, 7]);
assert.deepEqual(chart.bases[3], [13, 9, 12, 8, 11, 14, 17]);
assert.deepEqual(chart.bases[7], [6, 4, 2, 7, 5, 3, 1]);
assert.deepEqual(chart.bases[8], [6, 1, 3, 5, 7, 2, 4]);
assert.deepEqual(chart.base4Names, ["มหาอุจจ์", "พระเกตุ", "พระราหู", "พระอังคาร", "ราชาโชค", "จักรพรรดิ", "พระพุธ"]);

assert.deepEqual([...getBadNumbers(chart)].sort((a, b) => a - b), [1, 3, 4, 5]);
assert.deepEqual(
  buildRelationColumns(chart).map((item) => item.relations),
  [
    [],
    [],
    [{ name: "ธาตุลม", style: "blue" }],
    [{ name: "ศัตรู", style: "red" }],
    [],
    [],
    [{ name: "สมพล", style: "blue-strong" }],
  ],
);
assert.deepEqual(getRelations(1, 7, new Set()), [{ name: "ธาตุไฟ", style: "blue" }]);
assert.deepEqual(getRelations(1, 7, new Set([1])), [{ name: "ศัตรู", style: "red" }]);
assert.deepEqual(getRelations(2, 12, new Set([2])), [{ name: "สมพล", style: "blue-strong" }, { name: "ศัตรู", style: "red" }]);

const verticalExample = calculateNineBases(1, 5, 7);
assert.equal(verticalExample.bases[2][0], 7);
assert.equal(verticalExample.bases[3][0], 13);
assert.equal(getLinkedCellKeys(verticalExample, 3, 1).vertical.has("4:1"), true);
assert.equal(getLinkedCellKeys(verticalExample, 4, 1).vertical.has("3:1"), true);

const reverseHighlightExample = calculateNineBases(1, 1, 1);
const reverseLinks = getLinkedCellKeys(reverseHighlightExample, 4, 1);
assert.equal(reverseLinks.vertical.has("3:1"), true);
assert.equal(reverseLinks.valueToRepeat, 1);
assert.equal(reverseLinks.equal.has("1:1"), true);
assert.equal(reverseLinks.equal.has("1:3"), false);

const screenshotChart = calculateNineBases(5, 5, 3);
assert.equal(screenshotChart.bases[2][3], 6);
assert.equal(screenshotChart.bases[3][3], 8);
const screenshotLinks = getLinkedCellKeys(screenshotChart, 4, 4);
assert.equal(screenshotLinks.valueToRepeat, 6);
for (const key of ["1:2", "2:2", "3:4", "5:1", "6:7", "7:3", "8:1", "9:1"]) {
  assert.equal(screenshotLinks.equal.has(key), true, `ต้องไฮไลท์เลข 6 ที่ ${key} เมื่อคลิกเลข 8 ฐาน 4`);
}
assert.equal(screenshotLinks.equal.has("4:4"), false, "เลข 8 ฐาน 4 ต้องเป็นเฉพาะช่องที่เลือก");

const userReportedChart = calculateNineBases(4, 2, 2);
assert.equal(userReportedChart.bases[2][6], 1);
assert.equal(userReportedChart.bases[3][6], 5);
const userReportedLinks = getLinkedCellKeys(userReportedChart, 4, 7);
assert.equal(userReportedLinks.valueToRepeat, 1);
assert.equal(userReportedLinks.equal.has("1:2"), false, "ห้ามไฮไลท์เลข 5 อื่นเมื่อคลิกเลข 5 ฐาน 4");
assert.equal(userReportedLinks.equal.has("3:7"), true, "ต้องไฮไลท์เลข 1 ที่ทาสี");
assert.equal(userReportedLinks.equal.has("8:1"), true, "ต้องไฮไลท์เลข 1 ในตำแหน่งอื่น");

const pdfBytes = buildPdfFromJpegBytes(new Uint8Array([255, 216, 255, 217]), 100, 80);
const pdfText = new TextDecoder("latin1").decode(pdfBytes);
assert.equal(pdfText.startsWith("%PDF-1.4"), true);
assert.equal(pdfText.includes("/Subtype /Image"), true);
assert.equal(pdfText.endsWith("%%EOF\n"), true);

assert.deepEqual(
  calculateAge({ year: 1984, month: 4, day: 22 }, { year: 2026, month: 9, day: 5 }),
  { years: 42, months: 4, days: 14, completed: 42, entering: 43 },
);
assert.deepEqual(
  calculateAge({ year: 2000, month: 2, day: 29 }, { year: 2025, month: 2, day: 28 }),
  { years: 25, months: 0, days: 0, completed: 25, entering: 26 },
);

console.log("✓ Calendar Engine golden tests passed");
console.log("✓ Nine-base Calculation Core tests passed");
console.log("✓ Base 3–4 relation and bad-house tests passed");
console.log("✓ PNG/PDF export core tests passed");
console.log("✓ Completed/entering age tests passed");

const { toggleSelection, selectionHighlights, houseAppearance, isSpecialResult } = await import('../js/selection-engine.js');
let picks = toggleSelection(userReportedChart, new Map(), 4, 7);
let colors = selectionHighlights(userReportedChart, picks);
assert.deepEqual([...colors.selected], ['4:7']);
assert(colors.related.has('8:1'));
assert(!colors.related.has('1:2'));
for (let col = 1; col <= 6; col++) picks = toggleSelection(userReportedChart, picks, 4, col);
assert.equal(picks.size, 7);
colors = selectionHighlights(userReportedChart, picks);
assert.equal(colors.selected.size, 7);
assert.equal(colors.related.size, 56);
picks = toggleSelection(userReportedChart, picks, 4, 7);
assert.equal(picks.size, 6);
assert(!selectionHighlights(userReportedChart, picks).related.has('8:1'));
picks = toggleSelection(userReportedChart, picks, 8, 1);
assert.equal(picks.size, 7);
picks = toggleSelection(userReportedChart, picks, 3, 7);
assert.equal(picks.size, 7);
assert(selectionHighlights(userReportedChart, picks).selected.has('3:7'));
assert.equal(houseAppearance(8,2).weight,400);
assert.equal(houseAppearance(3,6).className,'');
assert.equal(houseAppearance(3,1).weight,700);
assert(isSpecialResult(12)); assert(!isSpecialResult(5));
console.log('✓ Seven-group selection, deselection, blue priority and typography tests passed');

// Exercise the actual export drawing path without a browser or font dependency.
const { createChartCanvas } = await import('../js/export-engine.js');
const fills = [];
const ctx = new Proxy({ measureText: () => ({width: 60}), fill() { fills.push(this.fillStyle); } }, {
  get(target, key) { return key in target ? target[key] : () => {}; }
});
globalThis.document = { fonts: { ready: Promise.resolve() }, createElement: () => ({ getContext: () => ctx }) };
const exportPicks = toggleSelection(userReportedChart, new Map(), 4, 7);
await createChartCanvas({ chart: userReportedChart, calendar: {
  input: {day:22,month:4,yearBe:2527,time:'01:49'}, effectiveDate:'1984-04-21',
  weekday:{name:'เสาร์'},lunar:{monthName:'เดือน 5'},zodiac:{name:'ชวด'}
}, highlights: selectionHighlights(userReportedChart, exportPicks) });
assert.equal(fills.filter(c => c === '#eef4fc').length, 1);
assert.equal(fills.filter(c => c === '#fff9ec').length, 8);
delete globalThis.document;
console.log('✓ Export canvas preserves selected blue and all eight linked yellow cells');
